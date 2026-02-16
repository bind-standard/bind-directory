// ---------------------------------------------------------------------------
// BIND primitive types (subset relevant for directory)
// ---------------------------------------------------------------------------

export interface Coding {
  system?: string;
  code: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Address {
  use?: "home" | "work" | "temp" | "old" | "billing";
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface ContactPoint {
  system: "phone" | "fax" | "email" | "url" | "sms" | "other";
  value: string;
  use?: "home" | "work" | "temp" | "old" | "mobile";
}

// ---------------------------------------------------------------------------
// Regulatory credential (license, registration, etc.)
// ---------------------------------------------------------------------------

export interface RegulatoryCredential {
  /** Type of credential (e.g. "broker-license", "insurer-registration") */
  type: string;
  /** Issuing authority or regulator name (e.g. "Autorité des marchés financiers") */
  authority: string;
  /** License or registration number */
  identifier: string;
  /** URL to the public registry where this credential can be verified */
  registryUrl?: string;
  /** Jurisdiction code (e.g. "QC", "ON", "CA") */
  jurisdiction?: string;
}

// ---------------------------------------------------------------------------
// Directory Organization (BIND Organization resource subset)
// ---------------------------------------------------------------------------

export interface DirectoryOrganization {
  resourceType: "Organization";
  name: string;
  status: "active" | "inactive" | "entered-in-error";
  type: CodeableConcept;
  address?: Address[];
  contact?: ContactPoint[];
  linesOfBusiness?: CodeableConcept[];
  territories?: string[];
  credentials?: RegulatoryCredential[];
}

// ---------------------------------------------------------------------------
// Participant manifest (directory-level wrapper)
// ---------------------------------------------------------------------------

export const DIRECTORY_ISS_ROOT = "https://bindpki.org";

export interface ParticipantManifest {
  schemaVersion: "1.0";
  slug: string;
  displayName?: string;
  description: string;
  jwksUrl?: string;
  joinedAt: string;
  status: "active" | "pending" | "suspended" | "revoked";
  organization: DirectoryOrganization;
}
