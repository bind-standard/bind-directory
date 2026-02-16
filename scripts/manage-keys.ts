import * as crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";

const participantsDir = join(__dirname, "..", "participants");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JWK {
  kty?: string;
  kid?: string;
  alg?: string;
  use?: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  nbf?: number;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

interface JWKS {
  keys: JWK[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPrompt(): (question: string) => Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
  (ask as any).close = () => rl.close();
  return ask;
}

function ts(epoch: number): string {
  return new Date(epoch * 1000).toISOString().split("T")[0];
}

function computeThumbprint(key: JWK): string {
  const canonical = JSON.stringify({ crv: key.crv, kty: key.kty, x: key.x, y: key.y });
  return crypto.createHash("sha256").update(canonical).digest("base64url");
}

function readJwks(slug: string): JWKS {
  const path = join(participantsDir, slug, "jwks.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJwks(slug: string, jwks: JWKS): void {
  const path = join(participantsDir, slug, "jwks.json");
  writeFileSync(path, `${JSON.stringify(jwks, null, 2)}\n`);
}

function keyStatus(key: JWK): string {
  const now = Math.floor(Date.now() / 1000);
  if (typeof key.exp === "number" && key.exp < now) return "expired";
  if (typeof key.nbf === "number" && key.nbf > now) return "pending";
  return "active";
}

function printKeyTable(keys: JWK[]): void {
  const now = Math.floor(Date.now() / 1000);
  console.log("");
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const status = keyStatus(k);
    const icon = status === "active" ? "●" : status === "pending" ? "○" : "✕";
    const iat = typeof k.iat === "number" ? ts(k.iat) : "—";
    const nbf = typeof k.nbf === "number" ? ts(k.nbf) : "—";
    const exp = typeof k.exp === "number" ? ts(k.exp) : "—";
    const remaining = typeof k.exp === "number" ? `${Math.ceil((k.exp - now) / 86400)}d` : "never";
    console.log(`  ${i + 1}. ${icon} ${k.kid}`);
    console.log(`     ${k.kty} ${k.crv || ""} | ${k.alg || "—"} | ${status}`);
    console.log(`     iat: ${iat}  nbf: ${nbf}  exp: ${exp}  (expires: ${remaining})`);
  }
  console.log("");
}

function listParticipants(): string[] {
  if (!existsSync(participantsDir)) return [];
  return readdirSync(participantsDir).filter(
    (e) => !e.startsWith(".") && statSync(join(participantsDir, e)).isDirectory(),
  );
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList(slug: string): Promise<void> {
  const jwks = readJwks(slug);
  console.log(`\n  Keys for ${slug} (${jwks.keys.length} key(s)):`);
  printKeyTable(jwks.keys);
}

async function cmdRotate(slug: string, ask: (q: string) => Promise<string>): Promise<void> {
  const jwks = readJwks(slug);

  console.log(`\n  Current keys for ${slug}:`);
  printKeyTable(jwks.keys);

  // Expire old keys
  const now = Math.floor(Date.now() / 1000);
  const expireInput = await ask(
    "  Set exp on existing active keys? Days from now (e.g. 30) [skip]: ",
  );
  if (expireInput) {
    const days = Number.parseInt(expireInput, 10);
    if (days > 0) {
      const expTs = now + days * 86400;
      for (const key of jwks.keys) {
        if (keyStatus(key) === "active") {
          key.exp = expTs;
          console.log(`    Set exp on ${key.kid} → ${ts(expTs)}`);
        }
      }
    }
  }

  // Generate new key
  console.log("\n  Generating new EC P-256 key pair...");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pubJwk = publicKey.export({ format: "jwk" });
  const privJwk = privateKey.export({ format: "jwk" });
  const kid = computeThumbprint(pubJwk as JWK);

  // New key lifecycle
  const newExpInput = await ask("  New key expiry in days (e.g. 365) [none]: ");
  let newExp: number | undefined;
  if (newExpInput) {
    const days = Number.parseInt(newExpInput, 10);
    if (days > 0) newExp = now + days * 86400;
  }

  const nbfInput = await ask("  New key valid starting in days from now (0 = now) [0]: ");
  let newNbf: number | undefined;
  const nbfDays = Number.parseInt(nbfInput || "0", 10);
  if (nbfDays > 0) newNbf = now + nbfDays * 86400;

  const pubKeyObj: JWK = {
    kty: pubJwk.kty,
    x: pubJwk.x,
    y: pubJwk.y,
    crv: pubJwk.crv,
    kid,
    use: "sig",
    alg: "ES256",
    iat: now,
  };
  if (newNbf !== undefined) pubKeyObj.nbf = newNbf;
  if (newExp !== undefined) pubKeyObj.exp = newExp;

  jwks.keys.push(pubKeyObj);
  writeJwks(slug, jwks);

  // Write private key
  const privKeyObj: JWK = {
    kty: privJwk.kty,
    x: privJwk.x,
    y: privJwk.y,
    d: privJwk.d,
    crv: privJwk.crv,
    kid,
    use: "sig",
    alg: "ES256",
    iat: now,
  };
  if (newNbf !== undefined) privKeyObj.nbf = newNbf;
  if (newExp !== undefined) privKeyObj.exp = newExp;

  const privKeyPath = join(participantsDir, slug, "private-key.json");
  const existingPriv = existsSync(privKeyPath);
  if (existingPriv) {
    // Append to array file or write alongside
    const newPath = join(participantsDir, slug, `private-key-${kid.slice(0, 8)}.json`);
    writeFileSync(newPath, `${JSON.stringify(privKeyObj, null, 2)}\n`);
    console.log(`\n  New private key saved to: private-key-${kid.slice(0, 8)}.json`);
  } else {
    writeFileSync(privKeyPath, `${JSON.stringify(privKeyObj, null, 2)}\n`);
    console.log("\n  New private key saved to: private-key.json");
  }

  console.log(`  New public key added to jwks.json (kid: ${kid})`);
  console.log(`\n  Updated keys for ${slug}:`);
  printKeyTable(jwks.keys);
}

async function cmdRetire(slug: string, ask: (q: string) => Promise<string>): Promise<void> {
  const jwks = readJwks(slug);
  const activeKeys = jwks.keys.filter((k) => keyStatus(k) === "active");

  if (activeKeys.length === 0) {
    console.log("\n  No active keys to retire.\n");
    return;
  }

  console.log(`\n  Active keys for ${slug}:`);
  for (let i = 0; i < activeKeys.length; i++) {
    console.log(`    ${i + 1}. ${activeKeys[i].kid}`);
  }

  const choice = await ask("\n  Key to retire (number): ");
  const idx = Number.parseInt(choice, 10) - 1;
  if (idx < 0 || idx >= activeKeys.length) {
    console.log("  Invalid selection.\n");
    return;
  }
  const target = activeKeys[idx];

  const now = Math.floor(Date.now() / 1000);
  const daysInput = await ask("  Expire in how many days from now? [0 = immediately]: ");
  const days = Number.parseInt(daysInput || "0", 10);
  const expTs = now + Math.max(0, days) * 86400;

  // Find the key in the original array and set exp
  const key = jwks.keys.find((k) => k.kid === target.kid);
  if (key) {
    key.exp = expTs;
    writeJwks(slug, jwks);
    console.log(`\n  Set exp on ${key.kid} → ${ts(expTs)}${days === 0 ? " (expired now)" : ""}`);
  }

  console.log(`\n  Updated keys for ${slug}:`);
  printKeyTable(jwks.keys);
}

async function cmdRemove(slug: string, ask: (q: string) => Promise<string>): Promise<void> {
  const jwks = readJwks(slug);

  if (jwks.keys.length === 0) {
    console.log("\n  No keys to remove.\n");
    return;
  }

  if (jwks.keys.length === 1) {
    console.log("\n  Cannot remove the only key — rotate first, then remove the old one.\n");
    return;
  }

  console.log(`\n  Keys for ${slug}:`);
  for (let i = 0; i < jwks.keys.length; i++) {
    const k = jwks.keys[i];
    console.log(`    ${i + 1}. ${k.kid} (${keyStatus(k)})`);
  }

  const choice = await ask("\n  Key to remove (number): ");
  const idx = Number.parseInt(choice, 10) - 1;
  if (idx < 0 || idx >= jwks.keys.length) {
    console.log("  Invalid selection.\n");
    return;
  }

  const removed = jwks.keys[idx];
  const confirm = await ask(`  Remove ${removed.kid}? This cannot be undone. (y/N): `);
  if (confirm.toLowerCase() !== "y") {
    console.log("  Cancelled.\n");
    return;
  }

  jwks.keys.splice(idx, 1);
  writeJwks(slug, jwks);
  console.log(`\n  Removed ${removed.kid} from jwks.json.`);
  console.log(`\n  Remaining keys for ${slug}:`);
  printKeyTable(jwks.keys);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n  BIND Trust Network — Key Management\n");

  const ask = createPrompt();

  // Select participant
  const participants = listParticipants();
  if (participants.length === 0) {
    console.log("  No participants found.\n");
    (ask as any).close();
    return;
  }

  console.log("  Participants:");
  for (let i = 0; i < participants.length; i++) {
    console.log(`    ${i + 1}. ${participants[i]}`);
  }

  let slug = "";
  while (!slug) {
    const input = await ask("\n  Select participant (number or slug): ");
    const byNumber = Number.parseInt(input, 10);
    if (byNumber >= 1 && byNumber <= participants.length) {
      slug = participants[byNumber - 1];
    } else if (participants.includes(input)) {
      slug = input;
    } else {
      console.log("  Invalid selection.");
    }
  }

  // Select command
  console.log(`\n  Managing keys for: ${slug}\n`);
  console.log("  Commands:");
  console.log("    1. list    — View all keys and their status");
  console.log("    2. rotate  — Generate a new key and optionally expire old ones");
  console.log("    3. retire  — Set an expiry on an active key");
  console.log("    4. remove  — Remove a key from jwks.json");

  let command = "";
  const validCommands = ["list", "rotate", "retire", "remove"];
  while (!command) {
    const input = await ask("\n  Command (number or name): ");
    const byNumber = Number.parseInt(input, 10);
    if (byNumber >= 1 && byNumber <= validCommands.length) {
      command = validCommands[byNumber - 1];
    } else if (validCommands.includes(input)) {
      command = input;
    } else {
      console.log("  Invalid command.");
    }
  }

  switch (command) {
    case "list":
      await cmdList(slug);
      break;
    case "rotate":
      await cmdRotate(slug, ask);
      break;
    case "retire":
      await cmdRetire(slug, ask);
      break;
    case "remove":
      await cmdRemove(slug, ask);
      break;
  }

  console.log("  Done. Run `pnpm run validate` to verify changes.\n");
  (ask as any).close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
