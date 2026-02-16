# BIND Directory

Public key infrastructure and trust directory for the [BIND Standard](https://bind-standard.org) — the open data model for insurance interoperability.

**Live:** [bindpki.org](https://bindpki.org)

## What This Is

The BIND Directory is a git-based registry of insurance participants — brokers, carriers, MGAs, TPAs, reinsurers, and vendors — and their public keys. It serves as the trust anchor for the BIND ecosystem: when a participant signs a BIND Bundle, anyone can verify the signature against the directory's published JWKS.

Each participant maintains a folder under `participants/` containing their manifest (organization metadata, regulatory credentials) and public keys. Git is the review and governance workflow — no database, no central authority.

## Directory Structure

```
participants/
└── your-org/
    ├── manifest.json   # Organization metadata and regulatory credentials
    ├── jwks.json       # Public keys in JWKS format
    ├── logo.png        # Organization logo (PNG)
    └── logo.svg        # Organization logo (SVG)
```

## Joining the Directory

The fastest way to join is the scaffold script:

```bash
pnpm run join-directory
```

This generates your participant folder with a key pair, pre-filled manifest, and prompts for regulatory credentials. See the full [How to Join](https://bindpki.org/join) guide for details.

### Verification

Before your PR is merged, email **directory@bind-standard.org** with your organization slug and regulatory credentials (license numbers, registry links). The BIND Standard Team verifies your organization's legitimacy — broker licenses, insurer registrations, bar admissions, etc.

## Manifest

Each participant's `manifest.json` contains organization metadata and an embedded BIND [Organization](https://bind-standard.org/resources/Organization) resource:

```json
{
  "schemaVersion": "1.0",
  "slug": "your-org",
  "displayName": "Your Org",
  "description": "A brief description of your organization.",
  "joinedAt": "2026-02-16",
  "status": "pending",
  "organization": {
    "resourceType": "Organization",
    "name": "Your Organization Inc.",
    "status": "active",
    "type": {
      "coding": [{ "system": "https://bind.codes/OrganizationType", "code": "broker", "display": "Broker" }]
    },
    "address": [{ "use": "work", "city": "Montréal", "state": "QC", "country": "CA" }],
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

## JWKS

Public keys are published in standard [JWKS](https://datatracker.ietf.org/doc/html/rfc7517) format. EC (P-256), RSA, and OKP key types are supported. Keys may include optional `nbf`, `exp`, and `iat` temporal fields for lifecycle management.

Once merged, keys are served at `bindpki.org/<slug>/.well-known/jwks.json`.

## Validation

The directory includes a comprehensive validation pipeline that checks structure, manifests, JWKS (including rejection of private key material), and logos:

```bash
pnpm run validate
```

## Stack

- [VitePress](https://vitepress.dev) for the directory site
- [Cloudflare Workers](https://workers.cloudflare.com) for hosting and JWKS serving
- [Biome](https://biomejs.dev) for linting and formatting
- TypeScript validation scripts for CI enforcement

## Development

```bash
pnpm install
pnpm run validate   # run all validation checks
pnpm run dev        # local dev server for the directory site
pnpm run build      # production build
pnpm run typecheck  # TypeScript type checking
pnpm run check      # Biome lint + format check
```

## Contributing

We welcome contributions from everyone. See [CONTRIBUTING.md](CONTRIBUTING.md) for details, or open a pull request directly.

For questions or ideas, reach out at **contact@bind-standard.org**.

## License

The BIND Directory is released under the [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) license — dedicated to the public domain. You are free to use, modify, and build upon it without restriction.
