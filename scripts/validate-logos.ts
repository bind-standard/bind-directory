import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const participantsDir = join(__dirname, "..", "participants");

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_LOGO_SIZE = 512 * 1024; // 512 KB

export function validateLogos(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(participantsDir)) {
    return { errors, warnings };
  }

  const entries = readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );

  for (const slug of entries) {
    const pngPath = join(participantsDir, slug, "logo.png");
    const svgPath = join(participantsDir, slug, "logo.svg");

    // Validate PNG
    if (existsSync(pngPath)) {
      const stat = statSync(pngPath);
      if (stat.size > MAX_LOGO_SIZE) {
        errors.push(
          `${slug}: logo.png exceeds ${MAX_LOGO_SIZE / 1024}KB (${Math.round(stat.size / 1024)}KB)`,
        );
      }

      const buffer = readFileSync(pngPath);
      const header = buffer.subarray(0, 8);
      if (!header.equals(PNG_MAGIC)) {
        errors.push(`${slug}: logo.png does not have valid PNG magic bytes`);
      }
    }

    // Validate SVG
    if (existsSync(svgPath)) {
      const stat = statSync(svgPath);
      if (stat.size > MAX_LOGO_SIZE) {
        errors.push(
          `${slug}: logo.svg exceeds ${MAX_LOGO_SIZE / 1024}KB (${Math.round(stat.size / 1024)}KB)`,
        );
      }

      const content = readFileSync(svgPath, "utf-8");
      if (!content.includes("<svg")) {
        errors.push(`${slug}: logo.svg does not contain an <svg> tag`);
      }
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  console.log("Validating logo files...\n");
  const { errors, warnings } = validateLogos();

  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
  for (const e of errors) {
    console.log(`  ✗ ${e}`);
  }

  if (errors.length === 0) {
    console.log("  ✓ Logo validation passed");
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
