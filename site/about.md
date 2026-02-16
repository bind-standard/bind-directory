# About the BIND Trust Network

The BIND Trust Network is a public directory of insurance industry participants who have registered their organizations and published their cryptographic public keys. It enables verification of signed [BIND Standard](https://bind-standard.org) resources.

## How It Works

1. **Participants register** by submitting a pull request to the [bind-directory](https://github.com/bind-standard/bind-directory) repository with their organization details and public keys.

2. **Keys are published** as JWKS (JSON Web Key Set) files, following [RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517). Each participant's keys are served at `bindpki.org/<slug>/.well-known/jwks.json`.

3. **Resources are verified** by checking the `iss` (issuer) claim in a signed BIND resource against the directory, then validating the signature using the participant's published public keys.

## Why a Trust Network?

Insurance data flows through many hands — insurers, brokers, MGAs, TPAs, experts, and technology providers. When a BIND resource (like a policy, claim, or submission) is exchanged between parties, the recipient needs to verify:

- **Who** created or signed the resource
- **Whether** that party is a recognized participant in the ecosystem
- **That** the resource hasn't been tampered with in transit

The BIND Trust Network provides the public key infrastructure to answer these questions.

## Directory Structure

Each participant has a folder in the repository containing:

| File | Purpose |
|------|---------|
| `manifest.json` | Organization metadata (name, type, jurisdictions, contacts) |
| `jwks.json` | Public keys in JWKS format |
| `logo.png` | Organization logo (PNG) |
| `logo.svg` | Organization logo (SVG) |

## Aggregated Directory

For programmatic consumers, an aggregated directory is available at [`/directory.json`](/directory.json). This file contains all active participants with their metadata and key URLs.

## Governance

The BIND Trust Network is maintained by the BIND Standard community. Participants are vetted through the pull request review process. Keys can be rotated by submitting an updated `jwks.json`.
