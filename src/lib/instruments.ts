/**
 * Canonical instrument metadata.
 *
 * Source of truth: `public.instruments` table.
 * The fields here mirror the DB columns with one naming concession: the DB
 * column is `instrument_name`, but this file exposes it as `name` for
 * downstream-callsite ergonomics. All other field names match the DB.
 *
 * Last verified against DB: Session 91 (2026-05-23).
 *
 * If you find this constant disagreeing with `public.instruments`, the DB wins.
 */

export interface Instrument {
  /** External identifier, e.g., "INST-001" */
  instrument_id: string;
  /** Database UUID */
  uuid: string;
  /** Short brand code shown to users, e.g., "PTP" */
  short_name: string;
  /** Full canonical name (DB column `instrument_name`) */
  name: string;
  /** Number of items in the instrument */
  total_items: number;
  /** Brief one-liner suitable for tile body copy */
  description: string;
  /** Whether the instrument is admin-assignment-only (mirrors DB `requires_assignment`). Not shown on the public assessments page or in coach order flows. */
  requires_assignment: boolean;
}

export const INSTRUMENTS: Instrument[] = [
  {
    instrument_id: "INST-001",
    uuid: "02618e9a-d411-44cf-b316-fe368edeac03",
    short_name: "PTP",
    name: "Personal Threat Profile",
    total_items: 89,
    description: "Measures nonconscious threat responses influencing behavior.",
    requires_assignment: false,
  },
  {
    instrument_id: "INST-002",
    uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520",
    short_name: "NAI",
    name: "Neuroscience Adoption Index",
    total_items: 25,
    description: "Measures beliefs and threat responses related to AI adoption.",
    requires_assignment: false,
  },
  {
    instrument_id: "INST-002L",
    uuid: "e5b3e839-d861-45ff-9f79-42887f5ae2de",
    short_name: "EPN",
    name: "Neuroscience Adoption Index — Executive Perspective",
    total_items: 25,
    description: "Executive Perspective variant of the NAI. Reworded for leaders to rate how they perceive the AI-adoption experience for employees in their organization.",
    requires_assignment: true,
  },
  {
    instrument_id: "INST-003",
    uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235",
    short_name: "AIRSA",
    name: "AI Readiness Skills Assessment",
    total_items: 24,
    description: "Assesses readiness to adopt and leverage AI tools.",
    requires_assignment: false,
  },
  {
    instrument_id: "INST-004",
    uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0",
    short_name: "HSS",
    name: "Habit Stabilization Scorecard",
    total_items: 3,
    description: "Measures stability of behavioral changes related to AI.",
    requires_assignment: false,
  },
];

// ----- Convenience accessors -----

/** Returns the instrument matching the short_name (e.g., "PTP"), or undefined. */
export function getInstrumentByShortName(short_name: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.short_name === short_name);
}

/** Returns the instrument matching the instrument_id (e.g., "INST-001"), or undefined. */
export function getInstrumentByInstrumentId(instrument_id: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.instrument_id === instrument_id);
}

/** Returns the instrument matching the UUID, or undefined. */
export function getInstrumentByUuid(uuid: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.uuid === uuid);
}

/** Map of instrument_id → short_name (e.g., "INST-001" → "PTP"). Includes all instruments including admin-assignment-only ones. */
export const INSTRUMENT_ID_TO_SHORT_NAME: Record<string, string> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.instrument_id, i.short_name])
);

/** Map of instrument_id → canonical full name. Includes all instruments including admin-assignment-only ones. */
export const INSTRUMENT_ID_TO_NAME: Record<string, string> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.instrument_id, i.name])
);

/** Instruments shown on the public assessments page and in standard coach order flows. Excludes admin-assignment-only variants like EPN. */
export const PUBLIC_INSTRUMENTS = INSTRUMENTS.filter((i) => !i.requires_assignment);
