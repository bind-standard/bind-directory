import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const participantsDir = join(__dirname, "..", "participants");

const REQUIRED_FILES = ["manifest.json", "jwks.json", "logo.png", "logo.svg"];
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export function validateStructure(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(participantsDir)) {
    warnings.push("participants/ directory does not exist");
    return { errors, warnings };
  }

  const entries = readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );

  if (entries.length === 0) {
    warnings.push("No participant directories found");
    return { errors, warnings };
  }

  for (const slug of entries) {
    const dir = join(participantsDir, slug);

    if (!SLUG_REGEX.test(slug)) {
      errors.push(`${slug}: slug is not URL-safe (must be lowercase alphanumeric with hyphens)`);
    }

    for (const file of REQUIRED_FILES) {
      const filePath = join(dir, file);
      if (!existsSync(filePath)) {
        errors.push(`${slug}: missing required file ${file}`);
      }
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  console.log("Validating participant directory structure...\n");
  const { errors, warnings } = validateStructure();

  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
  for (const e of errors) {
    console.log(`  ✗ ${e}`);
  }

  if (errors.length === 0) {
    console.log("  ✓ Structure validation passed");
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
