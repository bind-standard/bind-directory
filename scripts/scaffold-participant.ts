import * as crypto from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";

const participantsDir = join(__dirname, "..", "participants");

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const ORG_TYPES = [
  { code: "insurer", display: "Insurer" },
  { code: "broker", display: "Broker" },
  { code: "mga", display: "Managing General Agent" },
  { code: "tpa", display: "Third-Party Administrator" },
  { code: "reinsurer", display: "Reinsurer" },
  { code: "expert", display: "Expert" },
  { code: "counsel", display: "Counsel" },
  { code: "tech-provider", display: "Technology Provider" },
  { code: "industry-body", display: "Industry Body" },
] as const;

const CREDENTIAL_TYPES: Record<string, string[]> = {
  insurer: ["insurer-registration"],
  broker: ["broker-license"],
  mga: ["mga-license"],
  tpa: ["tpa-license"],
  reinsurer: ["reinsurer-registration"],
  expert: ["expert-license"],
  counsel: ["bar-admission"],
};

// ---------------------------------------------------------------------------
// Minimal placeholder files
// ---------------------------------------------------------------------------

// 1x1 transparent PNG (68 bytes)
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64",
);

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" fill="#ccc"/>' +
  '<text x="50" y="55" text-anchor="middle" font-size="12" fill="#666">Logo</text>' +
  "</svg>\n";

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------

function createPrompt(): (question: string) => Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
  // Attach close so caller can shut down
  (ask as any).close = () => rl.close();
  return ask;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n  BIND Trust Network — Participant Scaffold\n");

  const ask = createPrompt();

  // 1. Slug
  let slug = "";
  while (!slug) {
    const input = await ask("  Slug (lowercase, alphanumeric, hyphens): ");
    if (!SLUG_REGEX.test(input)) {
      console.log("    Invalid slug. Must match: ^[a-z0-9][a-z0-9-]*[a-z0-9]$ or single char.\n");
      continue;
    }
    if (existsSync(join(participantsDir, input))) {
      console.log(`    Participant "${input}" already exists.\n`);
      continue;
    }
    slug = input;
  }

  // 2. Organization name
  let orgName = "";
  while (!orgName) {
    orgName = await ask("  Organization name: ");
  }

  // 3. Organization type
  console.log("\n  Organization types:");
  for (let i = 0; i < ORG_TYPES.length; i++) {
    console.log(`    ${i + 1}. ${ORG_TYPES[i].code} — ${ORG_TYPES[i].display}`);
  }
  let orgType = "";
  while (!orgType) {
    const input = await ask("\n  Type (number or code): ");
    const byNumber = Number.parseInt(input, 10);
    if (byNumber >= 1 && byNumber <= ORG_TYPES.length) {
      orgType = ORG_TYPES[byNumber - 1].code;
    } else {
      const match = ORG_TYPES.find((t) => t.code === input);
      if (match) orgType = match.code;
      else console.log("    Invalid type.");
    }
  }
  const orgTypeDisplay = ORG_TYPES.find((t) => t.code === orgType)?.display ?? orgType;

  // 4. Display name
  const displayName = (await ask(`  Display name [${orgName}]: `)) || orgName;

  // 5. Description
  let description = "";
  while (!description) {
    const input = await ask("  Description (max 300 chars): ");
    if (input.length > 300) {
      console.log(`    Too long (${input.length} chars). Max 300.\n`);
      continue;
    }
    if (!input) {
      console.log("    Description is required.\n");
      continue;
    }
    description = input;
  }

  // 6. Country
  const country = (await ask("  Country code [CA]: ")) || "CA";

  // 7. Region/state
  const state = await ask("  Region/state (optional): ");

  // 8. Regulatory credentials
  console.log("\n  --- Regulatory Credentials ---");
  console.log("  Verifiable credentials help the BIND community validate your organization.");
  console.log("  Examples: broker license number, insurer registration, bar admission, etc.\n");

  const suggestedTypes = CREDENTIAL_TYPES[orgType] || [];
  if (suggestedTypes.length > 0) {
    console.log(`  Suggested credential type for ${orgType}: ${suggestedTypes.join(", ")}\n`);
  }

  const credentials: {
    type: string;
    authority: string;
    identifier: string;
    registryUrl?: string;
    jurisdiction?: string;
  }[] = [];

  let addMore = true;
  while (addMore) {
    const credType =
      (await ask(`  Credential type [${suggestedTypes[0] || "license"}]: `)) ||
      suggestedTypes[0] ||
      "license";
    const authority = await ask("  Issuing authority (e.g. Autorité des marchés financiers): ");
    const identifier = await ask("  License/registration number: ");
    const registryUrl = await ask("  Public registry URL (optional): ");
    const jurisdictionInput = await ask(`  Jurisdiction [${state || country}]: `);
    const jurisdiction = jurisdictionInput || state || country;

    if (authority && identifier) {
      const cred: (typeof credentials)[number] = {
        type: credType,
        authority,
        identifier,
        jurisdiction,
      };
      if (registryUrl) cred.registryUrl = registryUrl;
      credentials.push(cred);
      console.log("    Credential added.\n");
    } else {
      console.log("    Skipped (authority and identifier are required).\n");
    }

    const more = await ask("  Add another credential? (y/N): ");
    addMore = more.toLowerCase() === "y";
  }

  // --- Generate key pair ---
  console.log("\n  Generating EC P-256 key pair...");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pubJwk = publicKey.export({ format: "jwk" });
  const privJwk = privateKey.export({ format: "jwk" });

  // RFC 7638 JWK Thumbprint — SHA-256 of canonical required members in lexicographic order
  const thumbprintInput = JSON.stringify({
    crv: pubJwk.crv,
    kty: pubJwk.kty,
    x: pubJwk.x,
    y: pubJwk.y,
  });
  const thumbprint = crypto.createHash("sha256").update(thumbprintInput).digest("base64url");
  const kid = thumbprint;

  // --- Build output files ---
  const address: { use: string; country: string; state?: string } = { use: "work", country };
  if (state) address.state = state;

  const organization: Record<string, unknown> = {
    resourceType: "Organization",
    name: orgName,
    status: "active",
    type: {
      coding: [
        { system: "https://bind.codes/OrganizationType", code: orgType, display: orgTypeDisplay },
      ],
    },
    address: [address],
    contact: [{ system: "url", value: `https://${slug}.com` }],
  };

  if (credentials.length > 0) {
    organization.credentials = credentials;
  }

  const manifest = {
    schemaVersion: "1.0",
    slug,
    displayName,
    description,
    joinedAt: new Date().toISOString().split("T")[0],
    status: "pending",
    organization,
  };

  const jwks = {
    keys: [
      {
        kty: pubJwk.kty,
        x: pubJwk.x,
        y: pubJwk.y,
        crv: pubJwk.crv,
        kid,
        use: "sig",
        alg: "ES256",
      },
    ],
  };

  const privateKeyFile = {
    kty: privJwk.kty,
    x: privJwk.x,
    y: privJwk.y,
    d: privJwk.d,
    crv: privJwk.crv,
    kid,
    use: "sig",
    alg: "ES256",
  };

  // --- Write files ---
  const dir = join(participantsDir, slug);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(dir, "jwks.json"), `${JSON.stringify(jwks, null, 2)}\n`);
  writeFileSync(join(dir, "private-key.json"), `${JSON.stringify(privateKeyFile, null, 2)}\n`);
  writeFileSync(join(dir, "logo.png"), PLACEHOLDER_PNG);
  writeFileSync(join(dir, "logo.svg"), PLACEHOLDER_SVG);

  console.log(`\n  Created participants/${slug}/`);
  console.log(`    manifest.json`);
  console.log(`    jwks.json        (public key, kid: ${kid})`);
  console.log(`    private-key.json (KEEP SECRET — gitignored)`);
  console.log(`    logo.png         (placeholder — replace with your logo)`);
  console.log(`    logo.svg         (placeholder — replace with your logo)`);

  console.log("\n  --- Next Steps ---");
  console.log(`  1. Email directory@bind-standard.org with your slug ("${slug}") and credentials`);
  console.log("     for verification by the BIND Standard Team.");
  console.log("  2. Replace the placeholder logos with your actual logos.");
  console.log("  3. Run: pnpm run validate");
  console.log("  4. Submit a pull request.\n");

  (ask as any).close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
