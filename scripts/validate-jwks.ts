import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const participantsDir = join(__dirname, "..", "participants");

const VALID_KEY_TYPES = ["EC", "RSA", "OKP"];
const PRIVATE_KEY_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "k"];

interface JWK {
  kty?: string;
  kid?: string;
  alg?: string;
  use?: string;
  nbf?: number;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

interface JWKS {
  keys?: JWK[];
}

export function validateJwks(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(participantsDir)) {
    return { errors, warnings };
  }

  const entries = readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );

  for (const slug of entries) {
    const jwksPath = join(participantsDir, slug, "jwks.json");
    if (!existsSync(jwksPath)) continue;

    let jwks: JWKS;
    try {
      jwks = JSON.parse(readFileSync(jwksPath, "utf-8"));
    } catch {
      errors.push(`${slug}: jwks.json is not valid JSON`);
      continue;
    }

    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      errors.push(`${slug}: jwks.json must have a "keys" array`);
      continue;
    }

    if (jwks.keys.length === 0) {
      errors.push(`${slug}: jwks.json must contain at least one key`);
      continue;
    }

    const kids = new Set<string>();

    for (let i = 0; i < jwks.keys.length; i++) {
      const key = jwks.keys[i];
      const keyLabel = `${slug}: key[${i}]`;

      if (!key.kty) {
        errors.push(`${keyLabel}: missing "kty" field`);
      } else if (!VALID_KEY_TYPES.includes(key.kty)) {
        errors.push(
          `${keyLabel}: unsupported key type "${key.kty}" (${VALID_KEY_TYPES.join(", ")})`,
        );
      }

      if (!key.kid) {
        errors.push(`${keyLabel}: missing "kid" field`);
      } else {
        if (kids.has(key.kid)) {
          errors.push(`${keyLabel}: duplicate kid "${key.kid}"`);
        }
        kids.add(key.kid);
      }

      for (const field of PRIVATE_KEY_FIELDS) {
        if (field in key) {
          errors.push(
            `${keyLabel}: contains private key material ("${field}") — only public keys are allowed`,
          );
        }
      }

      // Temporal field validation (nbf, exp, iat)
      const now = Math.floor(Date.now() / 1000);

      for (const field of ["nbf", "exp", "iat"] as const) {
        if (field in key) {
          if (typeof key[field] !== "number" || !Number.isFinite(key[field])) {
            errors.push(`${keyLabel}: "${field}" must be a number (Unix timestamp)`);
          }
        }
      }

      if (typeof key.exp === "number" && Number.isFinite(key.exp) && key.exp < now) {
        warnings.push(`${keyLabel}: key has expired (exp: ${key.exp})`);
      }

      if (typeof key.nbf === "number" && Number.isFinite(key.nbf) && key.nbf > now) {
        warnings.push(`${keyLabel}: key is not yet valid (nbf: ${key.nbf})`);
      }
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  console.log("Validating JWKS files...\n");
  const { errors, warnings } = validateJwks();

  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
  for (const e of errors) {
    console.log(`  ✗ ${e}`);
  }

  if (errors.length === 0) {
    console.log("  ✓ JWKS validation passed");
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
