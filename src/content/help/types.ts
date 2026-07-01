export type HelpRole =
  | "individual"
  | "coach_client"
  | "coach"
  | "mentor"
  | "org_member"
  | "org_admin"
  | "super_admin";

/**
 * A visual highlight box overlaid on a step's screenshot.
 * Coordinates are percentages of the image's natural size (0-100),
 * so the overlay scales correctly at any render width.
 */
export interface HelpHotspot {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  shape?: "rect" | "circle";
}

export interface HelpStep {
  title: string;
  body: string;
  /** CDN URL from a .asset.json file; omit if no screenshot yet. */
  imageUrl?: string;
  imageAlt?: string;
  /** Optional highlight boxes drawn over the screenshot. */
  hotspots?: HelpHotspot[];
}

export interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
}

export interface HelpRoleContent {
  role: HelpRole;
  label: string;
  description: string;
  guides: HelpGuide[];
}
