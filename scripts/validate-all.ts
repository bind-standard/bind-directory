import { validateJwks } from "./validate-jwks";
import { validateLogos } from "./validate-logos";
import { validateManifests } from "./validate-manifest";
import { validateStructure } from "./validate-structure";

interface ValidationResult {
  name: string;
  errors: string[];
  warnings: string[];
}

function main() {
  console.log("Running all BIND Directory validations...\n");

  const results: ValidationResult[] = [
    { name: "Structure", ...validateStructure() },
    { name: "Manifests", ...validateManifests() },
    { name: "JWKS", ...validateJwks() },
    { name: "Logos", ...validateLogos() },
  ];

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const status = result.errors.length > 0 ? "✗" : "✓";
    console.log(`${status} ${result.name}`);

    for (const w of result.warnings) {
      console.log(`    ⚠ ${w}`);
      totalWarnings++;
    }
    for (const e of result.errors) {
      console.log(`    ✗ ${e}`);
      totalErrors++;
    }
  }

  console.log(`\nSummary: ${totalErrors} error(s), ${totalWarnings} warning(s)`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
