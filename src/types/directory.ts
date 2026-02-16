import type { ParticipantManifest } from "./manifest";

export interface DirectoryEntry extends ParticipantManifest {
  iss: string;
  logoUrl: string;
  jwksUrl: string;
  profileUrl: string;
}

export interface Directory {
  schemaVersion: "1.0";
  generatedAt: string;
  participants: DirectoryEntry[];
}
