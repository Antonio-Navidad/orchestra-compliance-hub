// Deadline calculation engine for federal compliance requirements

export interface ShipmentDeadline {
  id: string;
  type: DeadlineType;
  label: string;
  shortLabel: string;
  dueDate: Date;
  sourceDate?: Date;
  sourceLabel?: string;
  status: 'upcoming' | 'due_soon' | 'urgent' | 'overdue';
  daysRemaining: number;
  hoursRemaining: number;
  consequence: string;
  regulation: string;
  penalty: string;
}

export type DeadlineType =
  | 'isf_filing'
  | 'entry_summary_7501'
  | 'cf28_response'
  | 'protest_deadline'
  | 'fta_expiry'
  | 'bond_renewal'
  | 'free_time';

// Add business days (skip weekends)
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

function getStatus(dueDate: Date, now: Date): ShipmentDeadline['status'] {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 0) return 'overdue';
  if (diffHours < 48) return 'urgent';
  if (diffHours < 168) return 'due_soon'; // 7 days
  return 'upcoming';
}

function getDiffs(dueDate: Date, now: Date): { daysRemaining: number; hoursRemaining: number } {
  const diffMs = dueDate.getTime() - now.getTime();
  return {
    daysRemaining: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hoursRemaining: Math.floor(diffMs / (1000 * 60 * 60)),
  };
}

export interface DeadlineInputs {
  shipmentMode: string;
  vesselEtd?: string | Date | null;
  vesselEta?: string | Date | null;
  entry3461FiledDate?: string | Date | null;
  cf28ReceivedDate?: string | Date | null;
  liquidationDate?: string | Date | null;
  ftaExpiryDate?: string | Date | null;
  bondExpiryDate?: string | Date | null;
  freeTimeExpiry?: string | Date | null;
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateDeadlines(inputs: DeadlineInputs): ShipmentDeadline[] {
  const now = new Date();
  const deadlines: ShipmentDeadline[] = [];

  const etd = toDate(inputs.vesselEtd);
  const eta = toDate(inputs.vesselEta);
  const entry3461 = toDate(inputs.entry3461FiledDate);
  const cf28 = toDate(inputs.cf28ReceivedDate);
  const liquidation = toDate(inputs.liquidationDate);
  const ftaExpiry = toDate(inputs.ftaExpiryDate);
  const bondExpiry = toDate(inputs.bondExpiryDate);
  const freeTime = toDate(inputs.freeTimeExpiry);

  // 1. ISF Filing — ETD minus 24 hours (ocean only)
  if (etd && (inputs.shipmentMode === 'ocean_import' || inputs.shipmentMode === 'sea')) {
    const dueDate = addHours(etd, -24);
    const diffs = getDiffs(dueDate, now);
    deadlines.push({
      id: 'isf_filing',
      type: 'isf_filing',
      label: 'ISF 10+2 Filing',
      shortLabel: 'ISF',
      dueDate,
      sourceDate: etd,
      sourceLabel: 'Vessel ETD',
      status: getStatus(dueDate, now),
      ...diffs,
      consequence: 'CBP will issue a $5,000 per-violation penalty. Cargo may be held at port.',
      regulation: '19 CFR 149',
      penalty: '$5,000 per violation',
    });
  }

  // 2. Entry Summary (7501) — 3461 filed date + 10 business days
  if (entry3461) {
    const dueDate = addBusinessDays(entry3461, 10);
    const diffs = getDiffs(dueDate, now);
    deadlines.push({
      id: 'entry_summary_7501',
      type: 'entry_summary_7501',
      label: 'Entry Summary (CBP 7501)',
      shortLabel: '7501',
      dueDate,
      sourceDate: entry3461,
      sourceLabel: 'Form 3461 filed',
      status: getStatus(dueDate, now),
      ...diffs,
      consequence: 'Liquidated damages assessed. Entry may be force-liquidated at higher rate.',
      regulation: '19 CFR 142.12',
      penalty: 'Liquidated damages (bond amount)',
    });
  } else if (eta) {
    // Estimate: assume 3461 filed on arrival day
    const estimated3461 = eta;
    const dueDate = addBusinessDays(estimated3461, 10);
    const diffs = getDiffs(dueDate, now);
    deadlines.push({
      id: 'entry_summary_7501',
      type: 'entry_summary_7501',
      label: 'Entry Summary (CBP 7501)',
      shortLabel: '7501',
      dueDate,
      sourceDate: eta,
      sourceLabel: 'ETA (estimated)',
      status: getStatus(dueDate, now),
      ...diffs,
      consequence: 'Liquidated damages assessed. Entry may be force-liquidated at higher rate.',
      regulation: '19 CFR 142.12',
      penalty: 'Liquidated damages (bond amount)',
    });
  }

  // 3. CF-28 Response — received date + 30 calendar days
  if (cf28) {
    const dueDate = addDays(cf28, 30);
    const diffs = getDiffs(dueDate, now);
    deadlines.push({
      id: 'cf28_response',
      type: 'cf28_response',
      label: 'CF-28 Response Deadline',
      shortLabel: 'CF-28',
      dueDate,
      sourceDate: cf28,
      sourceLabel: 'CF-28 received',
      status: getStatus(dueDate, now),
      ...diffs,
      consequence: 'CBP will liquidate the entry at a rate they determine, typically the highest applicable rate.',
      regulation: '19 CFR 151.11',
      penalty: 'Entry liquidated at highest rate',
    });
  }

  // 4. Protest Deadline (Form 19) — liquidation date + 180 days
  if (liquidation) {
    const dueDate = addDays(liquidation, 180);
    const diffs = getDiffs(dueDate, now);
    deadlines.push({
      id: 'protest_deadline',
      type: 'protest_deadline',
      label: 'Protest Filing (CBP Form 19)',
      shortLabel: 'Protest',
      dueDate,
      sourceDate: liquidation,
      sourceLabel: 'Liquidation date',
      status: getStatus(dueDate, now),
      ...diffs,
      consequence: 'Right to contest CBP\'s liquidation decision is permanently lost. No refund possible.',
      regulation: '19 U.S.C. 1514',
      penalty: 'Permanent loss of refund rights',
    });
  }

  // 5. FTA Certificate Expiry
  if (ftaExpiry) {
    const warnDate = addDays(ftaExpiry, -30);
    const diffs = getDiffs(ftaExpiry, now);
    deadlines.push({
      id: 'fta_expiry',
      type: 'fta_expiry',
      label: 'FTA Certificate Expiry',
      shortLabel: 'FTA',
      dueDate: ftaExpiry,
      sourceDate: ftaExpiry,
      sourceLabel: 'Certificate expiry',
      status: now >= warnDate ? (now >= ftaExpiry ? 'overdue' : getStatus(ftaExpiry, now)) : 'upcoming',
      ...diffs,
      consequence: 'FTA duty claim rejected. Standard Column 1 General duty rate applied.',
      regulation: '19 CFR Part 182',
      penalty: 'Full duty rate applied (no FTA benefit)',
    });
  }

  // 6. Customs Bond Renewal
  if (bondExpiry) {
    const warnDate = addDays(bondExpiry, -60);
    const diffs = getDiffs(bondExpiry, now);
    deadlines.push({
      id: 'bond_renewal',
      type: 'bond_renewal',
      label: 'Customs Bond Renewal',
      shortLabel: 'Bond',
      dueDate: bondExpiry,
      sourceDate: bondExpiry,
      sourceLabel: 'Bond expiry',
      status: now >= warnDate ? (now >= bondExpiry ? 'overdue' : getStatus(bondExpiry, now)) : 'upcoming',
      ...diffs,
      consequence: 'No entries can be filed. All cargo held at port until bond reinstated.',
      regulation: '19 CFR 113',
      penalty: 'All imports halted',
    });
  }

  // 7. Free Time Expiration
  if (freeTime) {
    const diffs = getDiffs(freeTime, now);
    deadlines.push({
      id: 'free_time',
      type: 'free_time',
      label: 'Free Time Expiration',
      shortLabel: 'Free Time',
      dueDate: freeTime,
      sourceDate: freeTime,
      sourceLabel: 'Free time expires',
      status: getStatus(freeTime, now),
      ...diffs,
      consequence: 'Demurrage/detention charges begin accruing. Typically $150–$350/day per container.',
      regulation: 'Carrier tariff',
      penalty: '$150–$350/day per container',
    });
  }

  // Sort by due date
  deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return deadlines;
}

export function formatDeadlineCountdown(d: ShipmentDeadline): string {
  if (d.status === 'overdue') {
    const days = Math.abs(d.daysRemaining);
    return `OVERDUE — ${days} day${days !== 1 ? 's' : ''} past`;
  }
  if (Math.abs(d.hoursRemaining) < 48) {
    return `${d.hoursRemaining}h remaining`;
  }
  return `${d.daysRemaining} day${d.daysRemaining !== 1 ? 's' : ''} remaining`;
}

export function getMostUrgentDeadline(deadlines: ShipmentDeadline[]): ShipmentDeadline | null {
  if (deadlines.length === 0) return null;
  // Overdue first, then by soonest
  const overdue = deadlines.filter(d => d.status === 'overdue');
  if (overdue.length > 0) return overdue[0];
  return deadlines[0];
}

export function getDeadlinesWithin7Days(deadlines: ShipmentDeadline[]): ShipmentDeadline[] {
  return deadlines.filter(d => d.status === 'overdue' || d.status === 'urgent' || d.status === 'due_soon');
}
