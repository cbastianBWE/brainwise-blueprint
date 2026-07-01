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

export interface HelpCapture {
  /** Route to navigate to under the app base URL (e.g. "/dashboard"). */
  path: string;
  /**
   * Project-relative path of the target PNG whose `.asset.json` sibling
   * will be overwritten after the capture is uploaded to the CDN.
   * Example: "src/assets/help/individual/10_dashboard.png"
   */
  assetPath: string;
  /** Scroll to Y (in px) after load, before screenshotting. */
  scrollY?: number;
  /** Click a tab by its accessible name (e.g. "Users") before screenshotting. */
  tabName?: string;
  /** Extra ms to wait after navigation (default 2500). */
  waitMs?: number;
}

export interface HelpStep {
  title: string;
  body: string;
  /** CDN URL from a .asset.json file; omit if no screenshot yet. */
  imageUrl?: string;
  imageAlt?: string;
  /** Optional highlight boxes drawn over the screenshot. */
  hotspots?: HelpHotspot[];
  /**
   * Optional capture spec — when present the capture script will re-shoot
   * this step's screenshot and re-upload it to the CDN. Attach `capture`
   * to whichever step "owns" a unique screenshot; other steps that reuse
   * the same imageUrl don't need it.
   */
  capture?: HelpCapture;
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
