/**
 * LANE RESOLVER — Combines origin export + destination import + overlays
 * 
 * Single source of truth for what rules/requirements apply to a given lane.
 */

import {
  JURISDICTION_PACKS,
  EU_NATIONAL_OVERLAYS,
  COMMODITY_OVERLAYS,
  MODE_OVERLAYS,
  STAGE_OVERLAYS,
  RULE_PACKS_VERSION,
  type JurisdictionRulePack,
  type EUNationalOverlay,
  type CommodityOverlay,
  type ModeOverlay,
  type StageOverlay,
} from "./jurisdictionRulePacks";

// ── Types ─────────────────────────────────────────────────────────────

export interface ResolvedLaneContext {
  resolved: true;
  origin: {
    pack: JurisdictionRulePack;
    nationalOverlay?: EUNationalOverlay;
    role: "exporter";
  };
  destination: {
    pack: JurisdictionRulePack;
    nationalOverlay?: EUNationalOverlay;
    role: "importer";
  };
  modeOverlay: ModeOverlay;
  stageOverlay: StageOverlay;
  commodityOverlay: CommodityOverlay;

  // Merged view for easy consumption
  requiredDocs: string[];
  filingRequirements: string[];
  regulatoryAdvisories: string[];
  brokerCheckpoints: string[];
  fineTraps: string[];
  beginnerWarnings: string[];
  licenseTriggers: string[];

  // Labels
  laneLabel: string;
  originLabel: string;
  destinationLabel: string;
  rulesVersion: string;
}

export interface UnresolvedLaneContext {
  resolved: false;
  reason: string;
  originCode: string | null;
  destinationCode: string | null;
}

export type LaneResolverResult = ResolvedLaneContext | UnresolvedLaneContext;

// ── Country normalization ─────────────────────────────────────────────

const COUNTRY_TO_PACK: Record<string, string> = {
  // US
  "us": "US", "usa": "US", "unitedstates": "US", "unitedstatesofamerica": "US",
  // Colombia
  "co": "CO", "colombia": "CO",
  // Brazil
  "br": "BR", "brazil": "BR", "brasil": "BR",
  // China
  "cn": "CN", "china": "CN", "prc": "CN", "peoplesrepublicofchina": "CN",
  // Mexico
  "mx": "MX", "mexico": "MX",
  // EU core
  "eu": "EU", "europeanunion": "EU",
  "de": "EU", "germany": "EU",
  "it": "EU", "italy": "EU",
  "nl": "EU", "netherlands": "EU", "holland": "EU",
  "fr": "EU", "france": "EU",
  "es": "EU", "spain": "EU",
  "be": "EU", "belgium": "EU",
  "at": "EU", "austria": "EU",
  "pt": "EU", "portugal": "EU",
  "gr": "EU", "greece": "EU",
  "ie": "EU", "ireland": "EU",
  "pl": "EU", "poland": "EU",
  "se": "EU", "sweden": "EU",
  "dk": "EU", "denmark": "EU",
  "fi": "EU", "finland": "EU",
  "cz": "EU", "czechrepublic": "EU",
  "ro": "EU", "romania": "EU",
  "hu": "EU", "hungary": "EU",
  "sk": "EU", "slovakia": "EU",
  "hr": "EU", "croatia": "EU",
  "bg": "EU", "bulgaria": "EU",
  "lt": "EU", "lithuania": "EU",
  "lv": "EU", "latvia": "EU",
  "ee": "EU", "estonia": "EU",
  "si": "EU", "slovenia": "EU",
  "lu": "EU", "luxembourg": "EU",
  "mt": "EU", "malta": "EU",
  "cy": "EU", "cyprus": "EU",
  // UK
  "uk": "UK", "gb": "UK", "unitedkingdom": "UK", "greatbritain": "UK", "england": "UK",
  // Japan
  "jp": "JP", "japan": "JP",
  // South Korea
  "kr": "KR", "southkorea": "KR", "korea": "KR", "republicofkorea": "KR",
  // India
  "in": "IN", "india": "IN",
};

// Map to EU national overlay codes
const COUNTRY_TO_EU_NATIONAL: Record<string, string> = {
  "de": "DE", "germany": "DE",
  "it": "IT", "italy": "IT",
  "nl": "NL", "netherlands": "NL", "holland": "NL",
  "fr": "FR", "france": "FR",
  "es": "ES", "spain": "ES",
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePackCode(country: string): string | null {
  const n = normalize(country);
  return COUNTRY_TO_PACK[n] || null;
}

function resolveEUNational(country: string): EUNationalOverlay | undefined {
  const n = normalize(country);
  const code = COUNTRY_TO_EU_NATIONAL[n];
  return code ? EU_NATIONAL_OVERLAYS[code] : undefined;
}

// ── Commodity detection ───────────────────────────────────────────────

export function detectCommodityOverlay(hsCode: string): CommodityOverlay {
  if (!hsCode) return COMMODITY_OVERLAYS.general;

  const ch2 = hsCode.substring(0, 2);
  const ch4 = hsCode.substring(0, 4);

  // Check each overlay's HS patterns
  for (const [, overlay] of Object.entries(COMMODITY_OVERLAYS)) {
    if (overlay.id === "general" || overlay.id === "ecommerce") continue;
    if (overlay.hsPatterns.includes(ch2) || overlay.hsPatterns.includes(ch4)) {
      return overlay;
    }
  }

  return COMMODITY_OVERLAYS.general;
}

// ── Deduplicate helper ────────────────────────────────────────────────

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}

// ── Main resolver ─────────────────────────────────────────────────────

export function resolveLane(
  originCountry: string,
  destinationCountry: string,
  mode: string,
  workflowStage: string,
  hsCode?: string,
): LaneResolverResult {
  const originCode = resolvePackCode(originCountry);
  const destCode = resolvePackCode(destinationCountry);

  if (!originCode && !destCode) {
    return {
      resolved: false,
      reason: `No rule pack mapped for origin "${originCountry}" or destination "${destinationCountry}"`,
      originCode: null,
      destinationCode: null,
    };
  }
  if (!originCode) {
    return {
      resolved: false,
      reason: `No rule pack mapped for origin "${originCountry}". Destination "${destinationCountry}" resolves to ${destCode}.`,
      originCode: null,
      destinationCode: destCode,
    };
  }
  if (!destCode) {
    return {
      resolved: false,
      reason: `No rule pack mapped for destination "${destinationCountry}". Origin "${originCountry}" resolves to ${originCode}.`,
      originCode,
      destinationCode: null,
    };
  }

  const originPack = JURISDICTION_PACKS[originCode];
  const destPack = JURISDICTION_PACKS[destCode];
  const originNational = resolveEUNational(originCountry);
  const destNational = resolveEUNational(destinationCountry);
  const modeOverlay = MODE_OVERLAYS[mode] || MODE_OVERLAYS.sea;
  const stageOverlay = STAGE_OVERLAYS[workflowStage] || STAGE_OVERLAYS.pre_shipment;
  const commodityOverlay = detectCommodityOverlay(hsCode || "");

  // Merge: origin export + destination import + mode + commodity
  const requiredDocs = dedup([
    ...originPack.exportCore.requiredDocs,
    ...destPack.importCore.requiredDocs,
    ...modeOverlay.additionalDocs,
    ...commodityOverlay.additionalDocs,
  ]);

  const filingRequirements = dedup([
    ...originPack.exportCore.filingRequirements,
    ...destPack.importCore.filingRequirements,
    ...commodityOverlay.additionalFilings,
  ]);

  const regulatoryAdvisories = dedup([
    ...modeOverlay.advisories,
    ...commodityOverlay.advisories,
    ...stageOverlay.guidance,
  ]);

  const brokerCheckpoints = dedup([
    ...originPack.exportCore.brokerCheckpoints,
    ...destPack.importCore.brokerCheckpoints,
  ]);

  const fineTraps = dedup([
    ...originPack.exportCore.fineTraps,
    ...destPack.importCore.fineTraps,
  ]);

  const beginnerWarnings = dedup([
    ...originPack.exportCore.beginnerWarnings,
    ...destPack.importCore.beginnerWarnings,
    ...modeOverlay.beginnerWarnings,
    ...commodityOverlay.beginnerWarnings,
  ]);

  const licenseTriggers = dedup([
    ...originPack.exportCore.commonLicenses,
    ...destPack.importCore.commonLicenses,
  ]);

  // Build label
  const originLabel = originNational
    ? `${originNational.name} (${originPack.name})`
    : originPack.name;
  const destLabel = destNational
    ? `${destNational.name} (${destPack.name})`
    : destPack.name;

  return {
    resolved: true,
    origin: {
      pack: originPack,
      nationalOverlay: originNational,
      role: "exporter",
    },
    destination: {
      pack: destPack,
      nationalOverlay: destNational,
      role: "importer",
    },
    modeOverlay,
    stageOverlay,
    commodityOverlay,
    requiredDocs,
    filingRequirements,
    regulatoryAdvisories,
    brokerCheckpoints,
    fineTraps,
    beginnerWarnings,
    licenseTriggers,
    laneLabel: `${originLabel} → ${destLabel}`,
    originLabel,
    destinationLabel: destLabel,
    rulesVersion: RULE_PACKS_VERSION,
  };
}
