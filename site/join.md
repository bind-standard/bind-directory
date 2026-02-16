# How to Join

Joining the BIND Trust Network is open to any insurance industry participant. Follow these steps to register your organization and publish your public keys.

## Prerequisites

- A GitHub account
- An EC, RSA, or OKP key pair for signing BIND resources
- Your organization's logo in PNG and SVG formats

## Step 1: Fork the Repository

Fork [bind-standard/bind-directory](https://github.com/bind-standard/bind-directory) on GitHub.

## Quick Start (Recommended)

Run the scaffold script to generate your participant folder with keys:

```bash
pnpm run join-directory
```

This creates your folder under `participants/` with:
- A pre-filled `manifest.json`
- A generated EC P-256 key pair (`jwks.json` for public, `private-key.json` for private)
- Placeholder logos (replace with your actual logos)
- Prompts for regulatory credentials (license numbers, registry links)

**Important:** `private-key.json` is gitignored. Keep it secure — you'll need it to sign BIND resources.

If you prefer to set things up manually, follow the steps below.

## Step 2: Create Your Participant Folder

Create a new folder under `participants/` with your organization's slug (lowercase, alphanumeric, hyphens allowed):

```
participants/your-org/
├── manifest.json
├── jwks.json
├── logo.png
└── logo.svg
```

## Step 3: Create manifest.json

```json
{
  "schemaVersion": "1.0",
  "slug": "your-org",
  "displayName": "Your Org",
  "description": "A brief description of your organization (max 300 characters).",
  "joinedAt": "2026-02-16",
  "status": "pending",
  "organization": {
    "resourceType": "Organization",
    "name": "Your Organization Inc.",
    "status": "active",
    "type": {
      "coding": [{ "system": "https://bind.codes/OrganizationType", "code": "insurer", "display": "Insurer" }]
    },
    "address": [
      { "use": "work", "city": "Montréal", "state": "QC", "country": "CA" }
    ],
    "contact": [
      { "system": "url", "value": "https://your-org.com" },
      { "system": "email", "value": "jane@your-org.com", "use": "work" }
    ],
    "linesOfBusiness": [
      { "coding": [{ "code": "commercial-property" }], "text": "Commercial Property" },
      { "coding": [{ "code": "general-liability" }], "text": "General Liability" }
    ],
    "territories": ["QC"],
    "credentials": [
      {
        "type": "broker-license",
        "authority": "Autorité des marchés financiers",
        "identifier": "LIC-123456",
        "registryUrl": "https://lautorite.qc.ca/en/general-public/registers",
        "jurisdiction": "QC"
      }
    ]
  }
}
```

### Regulatory Credentials

The `credentials` array contains verifiable proof of your organization's regulatory standing. This helps the BIND community and maintainers verify the legitimacy of participants.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Credential type (e.g. `broker-license`, `insurer-registration`, `bar-admission`) |
| `authority` | Yes | Issuing authority (e.g. "Autorité des marchés financiers") |
| `identifier` | Yes | License or registration number |
| `registryUrl` | No | URL to the public registry where this credential can be verified |
| `jurisdiction` | No | Jurisdiction code (e.g. "QC", "ON") |

**Examples by organization type:**

| Org Type | Credential Type | Example Authority |
|----------|----------------|-------------------|
| Broker (QC) | `broker-license` | Autorité des marchés financiers (AMF) |
| Insurer (ON) | `insurer-registration` | Financial Services Regulatory Authority (FSRA) |
| Counsel | `bar-admission` | Barreau du Québec |

### Organization Types

| Code | Description |
|------|-------------|
| `insurer` | Insurance carrier |
| `broker` | Insurance broker |
| `mga` | Managing General Agent |
| `tpa` | Third-Party Administrator |
| `reinsurer` | Reinsurance company |
| `expert` | Claims adjuster, appraiser, or expert |
| `counsel` | Legal counsel |
| `tech-provider` | Insurance technology provider |
| `industry-body` | Industry association or standards body |

## Step 4: Create jwks.json

Export your **public** key(s) in JWKS format. Each key must have a unique `kid` (Key ID).

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "kid": "your-org-key-1",
      "use": "sig",
      "alg": "ES256",
      "x": "...",
      "y": "...",
      "iat": 1739750400,
      "exp": 1771286400
    }
  ]
}
```

### Key Lifecycle Fields

Keys support optional temporal fields (Unix timestamps) for lifecycle management:

| Field | Description |
|-------|-------------|
| `iat` | **Issued At** — when the key was created |
| `nbf` | **Not Before** — key is not valid before this time |
| `exp` | **Expires** — key is not valid after this time |

These fields are validated but not enforced as errors — expired keys produce warnings (they may linger during rotation), and not-yet-valid keys produce warnings as well. If you use the scaffold script (`pnpm run join-directory`), `iat` is set automatically and you are prompted for `exp` and `nbf`.

::: danger IMPORTANT
**Never include private key material.** The `d`, `p`, `q`, `dp`, `dq`, `qi`, and `k` fields must not be present. The validation pipeline will reject any JWKS containing private keys.
:::

## Step 5: Add Your Logos

- **logo.png** — PNG format, recommended 256x256px or larger, max 512KB
- **logo.svg** — SVG format, max 512KB

## Step 6: Validate Locally

```bash
pnpm install
pnpm run validate
```

All validations must pass before submitting.

## Step 7: Request Verification

Before submitting your pull request, email **directory@bind-standard.org** with:

- Your participant **slug**
- Your **organization name** and **type**
- Your **regulatory credentials** (license numbers, registration IDs)
- A **link to the public registry** where your credentials can be verified

The BIND Standard Team and community will verify your organization's legitimacy. This includes confirming your regulatory standing (e.g. broker license with AMF, insurer registration with FSRA, bar admission, etc.).

::: tip
Including a `credentials` array in your `manifest.json` with your license numbers and registry URLs speeds up the verification process significantly.
:::

## Step 8: Submit a Pull Request

Push your changes and open a pull request against the `main` branch. The CI pipeline will automatically validate your submission. The BIND team will review your PR once verification is complete.

## After Joining

Once your PR is merged, your organization will appear in the directory at `bindpki.org/participants/your-org` and your public keys will be served at `bindpki.org/your-org/.well-known/jwks.json`.

### Key Management

Use the key management script to rotate, retire, or remove keys:

```bash
pnpm run manage-keys
```

Available commands:

| Command | Description |
|---------|-------------|
| **list** | View all keys with their status (`active`, `pending`, `expired`) and lifecycle dates |
| **rotate** | Generate a new key pair, optionally set `exp` on existing active keys for a grace period |
| **retire** | Set an `exp` on an active key (immediately or after a grace period) |
| **remove** | Remove a key from `jwks.json` entirely (cannot remove the last key) |

**Recommended rotation workflow:**

1. Run `pnpm run manage-keys` → **rotate**
2. Set a 30-day expiry on the old key (grace period for consumers to pick up the new key)
3. Submit a PR with the updated `jwks.json`
4. After the grace period, run **remove** to clean up the expired key and submit another PR

::: tip
New private keys from rotation are saved as `private-key-<thumbprint>.json` alongside the original. All `private-key*.json` files are gitignored.
:::

### Updating Your Profile

Update your `manifest.json` and logos by submitting a PR with the changes.
