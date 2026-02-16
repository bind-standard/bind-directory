import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ParticipantManifest } from "../src/types/manifest";

const participantsDir = join(__dirname, "..", "participants");

const VALID_STATUSES = ["active", "pending", "suspended", "revoked"];
const VALID_ORG_STATUSES = ["active", "inactive", "entered-in-error"];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const URL_REGEX = /^https?:\/\/.+/;

export function validateManifests(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(participantsDir)) {
    return { errors, warnings };
  }

  const entries = readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );

  for (const slug of entries) {
    const manifestPath = join(participantsDir, slug, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    let manifest: ParticipantManifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      errors.push(`${slug}: manifest.json is not valid JSON`);
      continue;
    }

    if (manifest.schemaVersion !== "1.0") {
      errors.push(`${slug}: schemaVersion must be "1.0"`);
    }

    if (manifest.slug !== slug) {
      errors.push(`${slug}: manifest slug "${manifest.slug}" does not match folder name`);
    }

    if (!manifest.description || typeof manifest.description !== "string") {
      errors.push(`${slug}: description is required`);
    } else if (manifest.description.length > 300) {
      errors.push(`${slug}: description exceeds 300 characters (${manifest.description.length})`);
    }

    if (!manifest.joinedAt || !ISO_DATE_REGEX.test(manifest.joinedAt)) {
      errors.push(`${slug}: joinedAt must be an ISO 8601 date (YYYY-MM-DD)`);
    }

    if (!VALID_STATUSES.includes(manifest.status)) {
      errors.push(
        `${slug}: status "${manifest.status}" is not valid (${VALID_STATUSES.join(", ")})`,
      );
    }

    if (manifest.jwksUrl && !URL_REGEX.test(manifest.jwksUrl)) {
      errors.push(`${slug}: jwksUrl must be a valid URL if provided`);
    }

    // --- Organization validation ---
    const org = manifest.organization;
    if (!org) {
      errors.push(`${slug}: organization is required`);
      continue;
    }

    if (org.resourceType !== "Organization") {
      errors.push(`${slug}: organization.resourceType must be "Organization"`);
    }

    if (!org.name || typeof org.name !== "string") {
      errors.push(`${slug}: organization.name is required and must be a string`);
    }

    if (!VALID_ORG_STATUSES.includes(org.status)) {
      errors.push(
        `${slug}: organization.status "${org.status}" is not valid (${VALID_ORG_STATUSES.join(", ")})`,
      );
    }

    if (!org.type?.coding || !Array.isArray(org.type.coding) || org.type.coding.length === 0) {
      errors.push(`${slug}: organization.type.coding must have at least one entry`);
    }

    if (org.contact && Array.isArray(org.contact)) {
      for (const c of org.contact) {
        if (!c.system || typeof c.system !== "string") {
          errors.push(`${slug}: each organization.contact must have a system`);
        }
        if (!c.value || typeof c.value !== "string") {
          errors.push(`${slug}: each organization.contact must have a value`);
        }
      }
    }

    if (org.address && Array.isArray(org.address)) {
      for (const a of org.address) {
        if (!a.country || typeof a.country !== "string") {
          errors.push(`${slug}: each organization.address must have a country`);
        }
      }
    }

    if (org.credentials && Array.isArray(org.credentials)) {
      for (let i = 0; i < org.credentials.length; i++) {
        const cred = org.credentials[i];
        const credLabel = `${slug}: organization.credentials[${i}]`;
        if (!cred.type || typeof cred.type !== "string") {
          errors.push(`${credLabel}: type is required`);
        }
        if (!cred.authority || typeof cred.authority !== "string") {
          errors.push(`${credLabel}: authority is required`);
        }
        if (!cred.identifier || typeof cred.identifier !== "string") {
          errors.push(`${credLabel}: identifier is required`);
        }
        if (cred.registryUrl && !URL_REGEX.test(cred.registryUrl)) {
          errors.push(`${credLabel}: registryUrl must be a valid URL if provided`);
        }
      }
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  console.log("Validating participant manifests...\n");
  const { errors, warnings } = validateManifests();

  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
  for (const e of errors) {
    console.log(`  ✗ ${e}`);
  }

  if (errors.length === 0) {
    console.log("  ✓ Manifest validation passed");
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
