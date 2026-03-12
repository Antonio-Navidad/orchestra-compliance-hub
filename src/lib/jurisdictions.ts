export interface JurisdictionAdapter {
  code: string;
  name: string;
  currency: string;
  holdDailyRate: number;       // daily cost of a customs hold
  storageDailyRate: number;    // storage fees per day
  avgPenaltyPercent: number;   // penalty as % of declared value
  legalEscalationCost: number; // avg legal/compliance cost
  reworkCost: number;          // internal correction cost
  notes: string;
}

export const jurisdictionAdapters: Record<string, JurisdictionAdapter> = {
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    holdDailyRate: 2500,
    storageDailyRate: 350,
    avgPenaltyPercent: 4,
    legalEscalationCost: 25000,
    reworkCost: 5000,
    notes: "CBP penalties under 19 USC 1592. Liquidated damages common for bonds.",
  },
  MX: {
    code: "MX",
    name: "Mexico",
    currency: "USD",
    holdDailyRate: 1800,
    storageDailyRate: 200,
    avgPenaltyPercent: 5,
    legalEscalationCost: 15000,
    reworkCost: 3500,
    notes: "SAT/Aduana fines. IMMEX program compliance critical. USMCA origin verification.",
  },
  EU: {
    code: "EU",
    name: "European Union",
    currency: "EUR",
    holdDailyRate: 2200,
    storageDailyRate: 300,
    avgPenaltyPercent: 3.5,
    legalEscalationCost: 20000,
    reworkCost: 4500,
    notes: "UCC (Union Customs Code). CBAM carbon border tariffs effective 2026. AEO benefits.",
  },
  CO: {
    code: "CO",
    name: "Colombia",
    currency: "USD",
    holdDailyRate: 1200,
    storageDailyRate: 150,
    avgPenaltyPercent: 6,
    legalEscalationCost: 10000,
    reworkCost: 2500,
    notes: "DIAN enforcement. Anti-dumping duties on steel/textiles. FTA compliance with US/EU.",
  },
  BR: {
    code: "BR",
    name: "Brazil",
    currency: "USD",
    holdDailyRate: 1500,
    storageDailyRate: 250,
    avgPenaltyPercent: 7,
    legalEscalationCost: 18000,
    reworkCost: 4000,
    notes: "Receita Federal. Complex ICMS/IPI tax structure. Strict Siscomex documentation.",
  },
  PA: {
    code: "PA",
    name: "Panama",
    currency: "USD",
    holdDailyRate: 1000,
    storageDailyRate: 180,
    avgPenaltyPercent: 4.5,
    legalEscalationCost: 12000,
    reworkCost: 2800,
    notes: "Colon Free Zone rules. ANA customs authority. Panama Canal transit documentation. TPA with US.",
  },
};

export interface ExposureCalculation {
  holdProbability: number;
  penaltyProbability: number;
  legalEscalationProbability: number;
  reworkProbability: number;
  expectedDelayDays: number;
  holdCost: number;
  penaltyCost: number;
  legalCost: number;
  reworkCost: number;
  totalExpectedLoss: number;
  avoidedExposure: number;
}

export function calculateExposure(
  riskScore: number,
  declaredValue: number,
  jurisdictionCode: string
): ExposureCalculation {
  const adapter = jurisdictionAdapters[jurisdictionCode] || jurisdictionAdapters.US;

  // Probabilities derived from risk score (0-100)
  const holdProbability = Math.min(riskScore / 100, 1);
  const penaltyProbability = Math.min((riskScore - 20) / 100, 1) * (riskScore > 20 ? 1 : 0);
  const legalEscalationProbability = Math.min((riskScore - 60) / 100, 1) * (riskScore > 60 ? 1 : 0);
  const reworkProbability = Math.min(riskScore / 80, 1);

  // Expected delay days
  const expectedDelayDays = Math.round(riskScore * 0.15);

  // Cost calculations
  const holdCost = holdProbability * (expectedDelayDays * (adapter.holdDailyRate + adapter.storageDailyRate));
  const penaltyCost = penaltyProbability * (declaredValue * adapter.avgPenaltyPercent / 100);
  const legalCost = legalEscalationProbability * adapter.legalEscalationCost;
  const reworkCostCalc = reworkProbability * adapter.reworkCost;

  const totalExpectedLoss = holdCost + penaltyCost + legalCost + reworkCostCalc;

  // Avoided exposure assumes Orchestra catches ~85% of issues
  const correctionRate = 0.85;
  const avoidedExposure = totalExpectedLoss * correctionRate;

  return {
    holdProbability: Math.round(holdProbability * 100),
    penaltyProbability: Math.round(penaltyProbability * 100),
    legalEscalationProbability: Math.round(legalEscalationProbability * 100),
    reworkProbability: Math.round(reworkProbability * 100),
    expectedDelayDays,
    holdCost: Math.round(holdCost),
    penaltyCost: Math.round(penaltyCost),
    legalCost: Math.round(legalCost),
    reworkCost: Math.round(reworkCostCalc),
    totalExpectedLoss: Math.round(totalExpectedLoss),
    avoidedExposure: Math.round(avoidedExposure),
  };
}
