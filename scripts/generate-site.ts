import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ParticipantManifest } from "../src/types/manifest";
import { DIRECTORY_ISS_ROOT } from "../src/types/manifest";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const participantsDir = join(__dirname, "..", "participants");
const siteDir = join(__dirname, "..", "site");
const participantPagesDir = join(siteDir, "participants");
const publicDir = join(siteDir, "public");
const logosDir = join(publicDir, "logos");

// Participant type labels for display
const TYPE_LABELS: Record<string, string> = {
  insurer: "Insurer",
  broker: "Broker",
  mga: "MGA",
  tpa: "TPA",
  reinsurer: "Reinsurer",
  expert: "Expert",
  counsel: "Counsel",
  "tech-provider": "Technology Provider",
  "industry-body": "Industry Body",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LoadedParticipant {
  slug: string;
  manifest: ParticipantManifest;
}

function loadParticipants(): LoadedParticipant[] {
  if (!existsSync(participantsDir)) return [];

  const entries = readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );

  const participants: LoadedParticipant[] = [];

  for (const slug of entries) {
    const manifestPath = join(participantsDir, slug, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const manifest: ParticipantManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      participants.push({ slug, manifest });
    } catch {
      console.error(`  ✗ Failed to parse ${slug}/manifest.json`);
    }
  }

  return participants.sort((a, b) =>
    a.manifest.organization.name.localeCompare(b.manifest.organization.name),
  );
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/\n/g, " ");
}

function getOrgType(manifest: ParticipantManifest): string {
  return manifest.organization.type.coding?.[0]?.code ?? "";
}

// ---------------------------------------------------------------------------
// Per-participant page
// ---------------------------------------------------------------------------

function generateParticipantPage(p: LoadedParticipant): string {
  const { slug, manifest } = p;
  const lines: string[] = [];

  lines.push(`---`);
  lines.push(`title: "${manifest.displayName || manifest.organization.name}"`);
  lines.push(`---`);
  lines.push("");

  const iss = `${DIRECTORY_ISS_ROOT}/${slug}`;

  lines.push(`<script setup>`);
  lines.push(`const manifest = ${JSON.stringify(manifest)};`);
  lines.push(`const iss = ${JSON.stringify(iss)};`);
  lines.push(`const jwks = ${JSON.stringify(loadJwks(slug))};`);
  lines.push(`</script>`);
  lines.push("");

  lines.push(`<ParticipantProfile :manifest="manifest" :iss="iss" :jwks="jwks" slug="${slug}" />`);
  lines.push("");

  return lines.join("\n");
}

function loadJwks(slug: string): { keys: unknown[] } {
  const jwksPath = join(participantsDir, slug, "jwks.json");
  if (!existsSync(jwksPath)) return { keys: [] };
  try {
    return JSON.parse(readFileSync(jwksPath, "utf-8"));
  } catch {
    return { keys: [] };
  }
}

// ---------------------------------------------------------------------------
// Directory index page
// ---------------------------------------------------------------------------

function generateDirectoryIndex(participants: LoadedParticipant[]): string {
  const lines: string[] = [];

  lines.push("---");
  lines.push('title: "Directory"');
  lines.push("---");
  lines.push("");
  lines.push("# Trust Network Directory");
  lines.push("");

  if (participants.length === 0) {
    lines.push("No participants have joined the directory yet.");
    lines.push("");
    lines.push("Want to join? See [How to Join](/join).");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`<script setup>`);
  lines.push(
    `const participants = ${JSON.stringify(
      participants.map((p) => ({
        slug: p.slug,
        name: p.manifest.displayName || p.manifest.organization.name,
        type: getOrgType(p.manifest),
        typeLabel: TYPE_LABELS[getOrgType(p.manifest)] || getOrgType(p.manifest),
        description: p.manifest.description,
        status: p.manifest.status,
      })),
    )};`,
  );
  lines.push(`</script>`);
  lines.push("");

  // Group by type
  const byType = new Map<string, LoadedParticipant[]>();
  for (const p of participants) {
    const type = getOrgType(p.manifest);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)?.push(p);
  }

  for (const [type, members] of byType) {
    const label = TYPE_LABELS[type] || type;
    lines.push(`## ${label}s`);
    lines.push("");
    lines.push('<div class="participant-grid">');
    lines.push("");
    for (const p of members) {
      const name = p.manifest.displayName || p.manifest.organization.name;
      lines.push(
        `<ParticipantCard name="${escapeAttr(name)}" slug="${p.slug}" type="${type}" typeLabel="${label}" description="${escapeAttr(p.manifest.description)}" status="${p.manifest.status}" />`,
      );
      lines.push("");
    }
    lines.push("</div>");
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarItem {
  text: string;
  link?: string;
  items?: SidebarItem[];
}

function generateSidebar(participants: LoadedParticipant[]): Record<string, SidebarItem[]> {
  const items: SidebarItem[] = [{ text: "Directory", link: "/participants/" }];

  for (const p of participants) {
    items.push({
      text: p.manifest.displayName || p.manifest.organization.name,
      link: `/participants/${p.slug}`,
    });
  }

  return {
    "/participants/": items,
  };
}

// ---------------------------------------------------------------------------
// directory.json
// ---------------------------------------------------------------------------

function generateDirectoryJson(participants: LoadedParticipant[]): string {
  const entries = participants
    .filter((p) => p.manifest.status === "active")
    .map((p) => ({
      ...p.manifest,
      iss: `${DIRECTORY_ISS_ROOT}/${p.slug}`,
      logoUrl: `/logos/${p.slug}.png`,
      jwksUrl: `/${p.slug}/.well-known/jwks.json`,
      profileUrl: `/participants/${p.slug}`,
    }));

  return JSON.stringify(
    {
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
      participants: entries,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Copy static assets
// ---------------------------------------------------------------------------

function copyParticipantAssets(participants: LoadedParticipant[]): void {
  for (const p of participants) {
    const { slug } = p;
    const srcDir = join(participantsDir, slug);

    // Copy logos
    const pngSrc = join(srcDir, "logo.png");
    const svgSrc = join(srcDir, "logo.svg");

    if (existsSync(pngSrc)) {
      copyFileSync(pngSrc, join(logosDir, `${slug}.png`));
    }
    if (existsSync(svgSrc)) {
      copyFileSync(svgSrc, join(logosDir, `${slug}.svg`));
    }

    // Copy JWKS to .well-known
    const jwksSrc = join(srcDir, "jwks.json");
    if (existsSync(jwksSrc)) {
      const wellKnownDir = join(publicDir, slug, ".well-known");
      mkdirSync(wellKnownDir, { recursive: true });
      copyFileSync(jwksSrc, join(wellKnownDir, "jwks.json"));
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("Generating BIND Directory site...\n");

  // Ensure output directories
  mkdirSync(participantPagesDir, { recursive: true });
  mkdirSync(logosDir, { recursive: true });

  const participants = loadParticipants();
  console.log(`  Found ${participants.length} participant(s)\n`);

  // Generate per-participant pages
  for (const p of participants) {
    const md = generateParticipantPage(p);
    writeFileSync(join(participantPagesDir, `${p.slug}.md`), md);
    console.log(`  ✓ participants/${p.slug}.md`);
  }

  // Generate directory index
  const indexMd = generateDirectoryIndex(participants);
  writeFileSync(join(participantPagesDir, "index.md"), indexMd);
  console.log(`  ✓ participants/index.md`);

  // Generate sidebar
  const sidebar = generateSidebar(participants);
  writeFileSync(
    join(siteDir, ".vitepress", "sidebar.json"),
    `${JSON.stringify(sidebar, null, 2)}\n`,
  );
  console.log(`  ✓ .vitepress/sidebar.json`);

  // Generate directory.json
  const directoryJson = generateDirectoryJson(participants);
  writeFileSync(join(publicDir, "directory.json"), `${directoryJson}\n`);
  console.log(`  ✓ public/directory.json`);

  // Copy static assets (logos, JWKS)
  copyParticipantAssets(participants);
  console.log(`  ✓ Copied logos and JWKS files`);

  console.log(`\nSite generation complete.`);
}

main();
