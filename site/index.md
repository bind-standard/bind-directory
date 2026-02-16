---
layout: home
hero:
  name: BIND Trust Network
  text: Insurance PKI Directory
  tagline: A public trust network directory where insurance industry participants register their organization and publish public keys for cryptographic verification of signed BIND resources.
  actions:
    - theme: brand
      text: Browse Directory
      link: /participants/
    - theme: alt
      text: Join the Network
      link: /join
    - theme: alt
      text: About
      link: /about
    - theme: alt
      text: BIND Standard
      link: https://bind-standard.org

features:
  - title: Cryptographic Trust
    details: Each participant publishes their public keys in JWKS format. Signed BIND resources can be verified against these keys, ensuring authenticity and integrity.
  - title: Open Directory
    details: A transparent, community-governed registry of insurance industry participants. Anyone can verify who signed a BIND resource and whether they are a trusted participant.
  - title: Standards-Based
    details: Built on JWKS (RFC 7517), served via .well-known endpoints. Compatible with existing cryptographic libraries and verification tooling.
---
