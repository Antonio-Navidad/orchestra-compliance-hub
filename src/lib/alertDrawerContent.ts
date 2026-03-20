// Universal alert drawer content registry
// Every alert, badge, pill, flag, and deadline resolves to a specific drawer

import type { ShipmentDeadline } from './deadlineEngine';

export interface AlertDrawerData {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success';
  whatIsThis: string;
  whyItMatters: string;
  whatToDo: string[];
  quickActions: Array<{
    label: string;
    type: 'upload' | 'request' | 'mark_na' | 'note' | 'navigate' | 'link';
    href?: string;
    docId?: string;
  }>;
  regulation?: string;
  financialImpact?: string;
}

// ─── Built-in drawer templates ───

const DRAWER_TEMPLATES: Record<string, AlertDrawerData> = {
  isf_filing: {
    id: 'isf_filing',
    title: 'ISF 10+2 Filing',
    severity: 'critical',
    whatIsThis: 'The Importer Security Filing (ISF), also called 10+2, is a mandatory electronic filing required by U.S. Customs and Border Protection for all ocean freight entering the United States. It contains 10 data elements about your shipment that you supply, plus 2 elements provided by the carrier.',
    whyItMatters: 'The ISF must be submitted at least 24 hours before your cargo is loaded onto the vessel at the foreign port. Late filing, inaccurate filing, or no filing can result in a $5,000 per-violation penalty from CBP. CBP can also hold your cargo at the port until the ISF is verified. Regulation: 19 CFR 149.',
    whatToDo: [
      'Gather the 10 required data elements from your commercial invoice and booking confirmation: seller name/address, buyer name/address, importer of record number, consignee number, manufacturer name/address, ship-to party name/address, country of origin, HTS 6-digit code, container stuffing location, consolidator name/address.',
      'File ISF through ABI/ACE immediately.',
      'Confirm ISF bond from surety company is active.',
      'Save the ISF confirmation number to this shipment record.',
    ],
    quickActions: [
      { label: 'Upload ISF confirmation', type: 'upload', docId: 'isf_filing' },
      { label: 'Request from broker', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 CFR 149',
    financialImpact: '$5,000 per violation',
  },

  fta_certificate: {
    id: 'fta_certificate',
    title: 'FTA Certificate of Origin — Expired or Missing',
    severity: 'critical',
    whatIsThis: 'A Free Trade Agreement (FTA) Certificate of Origin certifies that your goods were manufactured in a partner country and qualify for preferential (reduced or zero) duty rates under the applicable trade agreement. It is issued by the exporter or manufacturer and must be valid at the time of your entry filing.',
    whyItMatters: 'An expired or missing FTA certificate means CBP will reject your FTA duty claim and apply the standard Column 1 General duty rate. Depending on the HTS code, this can mean 2.5%–25% additional duties on the full declared value. You must have the certificate in your possession at time of filing — you do not submit it to CBP unless requested, but you must produce it on demand.',
    whatToDo: [
      'Contact your supplier immediately and request a new Certificate of Origin covering this shipment.',
      'The certificate must include: exporter name/address, importer name/address, goods description, HTS classification, origin criterion, and the exporter\'s signature and date.',
      'For KORUS: No official CBP form required — company letterhead is acceptable per 19 CFR Part 182 Annex 5-A.',
      'For USMCA: Use the USMCA certification of origin format per 19 CFR Part 182.',
      'Upload the new certificate to this slot before filing CBP Form 7501.',
    ],
    quickActions: [
      { label: 'Upload certificate', type: 'upload', docId: 'fta_certificate' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
    ],
    regulation: '19 CFR Part 182',
    financialImpact: 'Up to 25% additional duties on declared value',
  },

  freight_invoice: {
    id: 'freight_invoice',
    title: 'Freight Invoice Missing — CIF Shipment',
    severity: 'high',
    whatIsThis: 'Your commercial invoice shows CIF (Cost, Insurance, and Freight) Incoterms, meaning the seller paid freight and insurance to the destination port. Under U.S. customs valuation rules, these freight and insurance costs must be added to the price of goods to calculate the correct dutiable value.',
    whyItMatters: 'Without the freight invoice, the broker cannot calculate the accurate dutiable value for CBP Form 7501. Filing with an incorrect declared value is a violation of 19 U.S.C. 1592 (material false statement) and can result in penalties up to 4 times the unpaid duty amount.',
    whatToDo: [
      'Contact your freight forwarder or carrier and request the freight invoice for this shipment.',
      'The invoice must show freight charges in USD or with the exchange rate applied.',
      'If charges are not yet final, request a pro forma freight quote, use it to estimate dutiable value, then file a Post Summary Correction when the final invoice is available.',
      'Upload the freight invoice to this slot.',
    ],
    quickActions: [
      { label: 'Upload freight invoice', type: 'upload', docId: 'freight_invoice' },
      { label: 'Request from forwarder', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 U.S.C. 1592',
    financialImpact: 'Up to 4× unpaid duty amount',
  },

  transfer_pricing: {
    id: 'transfer_pricing',
    title: 'Related Party — Transfer Pricing Docs Required',
    severity: 'high',
    whatIsThis: 'Your commercial invoice indicates the buyer and seller are related parties — meaning they have a business relationship that could influence the price (parent company, subsidiary, business partners, etc.). CBP is aware that related parties sometimes set transfer prices below market value to minimize duties.',
    whyItMatters: 'CBP may question whether the declared price reflects actual market value. If CBP determines the price was influenced by the relationship, they can reject the transaction value and substitute a different valuation method, potentially resulting in additional duties plus interest, and a 19 U.S.C. 1592 penalty.',
    whatToDo: [
      'Obtain a transfer pricing study or intercompany pricing agreement documenting how the price was determined.',
      'Identify all assists — tooling, materials, engineering, or design provided free or at reduced cost to the foreign manufacturer — and add their value to the declared value.',
      'Keep this documentation on file for 5 years per 19 CFR Part 163. You do not submit it to CBP unless they issue a CF-28 Request for Information.',
    ],
    quickActions: [
      { label: 'Upload pricing docs', type: 'upload', docId: 'transfer_pricing' },
      { label: 'Request from finance', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
    ],
    regulation: '19 CFR Part 163',
    financialImpact: 'Duties + interest + 1592 penalty',
  },

  // ─── Cross-document discrepancy drawers ───

  description_mismatch: {
    id: 'description_mismatch',
    title: 'Invoice / Packing List Description Mismatch',
    severity: 'high',
    whatIsThis: 'The AI cross-reference engine found that a line item on your commercial invoice and the same line on your packing list use different descriptions for the same physical goods. Even small wording differences count as a discrepancy.',
    whyItMatters: 'CBP officers compare invoices and packing lists during examination. A description mismatch can trigger a Commercial Enforcement hold, delaying cargo release by 2–7 days and generating storage and demurrage charges at the port terminal.',
    whatToDo: [
      'Determine which description is correct — contact your supplier to confirm.',
      'Request either a corrected packing list or an amended commercial invoice from your supplier so both documents use identical terminology.',
      'Upload the corrected document to the relevant slot.',
      'If the shipment is already en route and corrections cannot arrive before the vessel, prepare a written explanation letter for CBP confirming the goods are identical — upload it as a supplemental document.',
    ],
    quickActions: [
      { label: 'Upload corrected doc', type: 'upload' },
      { label: 'Request correction', type: 'request' },
      { label: 'Add explanation note', type: 'note' },
    ],
    financialImpact: '2–7 day delay + storage/demurrage charges',
  },

  weight_mismatch: {
    id: 'weight_mismatch',
    title: 'Weight Discrepancy Between Documents',
    severity: 'medium',
    whatIsThis: 'The AI found that gross or net weight values differ between your commercial invoice, packing list, and/or bill of lading. Weight is a critical data element that CBP uses to verify cargo contents.',
    whyItMatters: 'A significant weight discrepancy (typically >5%) can trigger a CBP intensive examination, where the entire container is physically unloaded and weighed. This costs $2,000–$5,000 in exam fees plus 3–5 days of delay.',
    whatToDo: [
      'Compare the weight values across all documents and determine the correct actual weight.',
      'Request corrected documents from the party that issued the incorrect one.',
      'If the bill of lading weight is wrong, contact the carrier to request an amendment — this may require a letter of indemnity.',
      'Small rounding differences (<1%) are generally acceptable. Document any minor variances with a note.',
    ],
    quickActions: [
      { label: 'Upload corrected doc', type: 'upload' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: '$2,000–$5,000 exam fees + 3–5 day delay',
  },

  value_mismatch: {
    id: 'value_mismatch',
    title: 'Declared Value Discrepancy',
    severity: 'critical',
    whatIsThis: 'The AI found that the declared value on your commercial invoice does not match the value on another document (purchase order, entry summary, or packing list). The declared value is the basis for duty calculation.',
    whyItMatters: 'Under-declaring value is treated as fraud under 19 U.S.C. 1592. Even unintentional errors can result in penalties of 2× to 4× the unpaid duty amount, plus interest. CBP actively uses automated targeting to flag value discrepancies.',
    whatToDo: [
      'Verify the correct transaction value with your supplier.',
      'Ensure the commercial invoice reflects the actual price paid or payable for the goods.',
      'If assists, royalties, or other additions apply, ensure they are included in the declared value.',
      'Correct any documents with the wrong value and re-upload.',
    ],
    quickActions: [
      { label: 'Upload corrected invoice', type: 'upload', docId: 'commercial_invoice' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 U.S.C. 1592',
    financialImpact: '2×–4× unpaid duty + interest',
  },

  consignee_mismatch: {
    id: 'consignee_mismatch',
    title: 'Consignee Name Mismatch',
    severity: 'medium',
    whatIsThis: 'The consignee name on the bill of lading does not match the buyer name on the commercial invoice. These should refer to the same entity.',
    whyItMatters: 'Mismatched party names can delay cargo release as CBP verifies the importer of record. The carrier may also refuse to release cargo if the consignee on the B/L does not match the party requesting delivery.',
    whatToDo: [
      'Confirm whether the consignee and buyer are the same entity (possibly using different legal names or abbreviations).',
      'If they are different entities, provide documentation explaining the relationship (e.g., buying agent arrangement).',
      'Request a corrected bill of lading from the carrier if the B/L name is wrong.',
      'Request a corrected invoice from the supplier if the invoice buyer name is wrong.',
    ],
    quickActions: [
      { label: 'Upload corrected doc', type: 'upload' },
      { label: 'Request B/L amendment', type: 'request' },
      { label: 'Add explanation', type: 'note' },
    ],
    financialImpact: '1–3 day delay',
  },

  hts_mismatch: {
    id: 'hts_mismatch',
    title: 'HTS Code Discrepancy Between Documents',
    severity: 'critical',
    whatIsThis: 'The HTS (Harmonized Tariff Schedule) codes on your ISF filing or entry summary do not match the codes on your commercial invoice. HTS codes determine the duty rate, quota eligibility, and PGA requirements.',
    whyItMatters: 'An HTS mismatch between ISF and entry can trigger an ISF penalty ($5,000) plus incorrect duty payment. If the wrong HTS results in a lower duty rate, CBP treats this as a revenue loss violation.',
    whatToDo: [
      'Review all documents and determine the correct HTS classification for each line item.',
      'Use the HTS Classification Worksheet to document your classification rationale.',
      'If the ISF was filed with the wrong HTS, file an ISF amendment immediately.',
      'Correct the commercial invoice or entry summary as needed.',
    ],
    quickActions: [
      { label: 'Open HTS Worksheet', type: 'navigate', href: '/doc-intel' },
      { label: 'Upload corrected doc', type: 'upload' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 CFR 149 / 19 U.S.C. 1592',
    financialImpact: '$5,000 ISF penalty + duty difference',
  },

  container_seal_mismatch: {
    id: 'container_seal_mismatch',
    title: 'Container/Seal Number Mismatch',
    severity: 'high',
    whatIsThis: 'The container number or seal number on your ISF filing does not match the bill of lading. These must be identical for CBP\'s Automated Targeting System to clear your shipment.',
    whyItMatters: 'A container or seal mismatch is a red flag in CBP\'s targeting system and will almost certainly trigger a hold or exam. The ISF penalty for inaccurate data is $5,000 per violation.',
    whatToDo: [
      'Verify the correct container and seal numbers from the carrier\'s booking confirmation or B/L.',
      'If the ISF contains the wrong numbers, file an ISF amendment before the vessel arrives.',
      'Contact your carrier if the B/L numbers are incorrect.',
    ],
    quickActions: [
      { label: 'Upload corrected ISF', type: 'upload', docId: 'isf_filing' },
      { label: 'Request B/L amendment', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: '$5,000 ISF penalty + exam',
  },

  origin_mismatch: {
    id: 'origin_mismatch',
    title: 'Country of Origin Discrepancy',
    severity: 'critical',
    whatIsThis: 'The country of origin stated on your FTA certificate does not match the origin on your commercial invoice or ISF. Country of origin determines duty rates, FTA eligibility, AD/CVD liability, and Section 301 applicability.',
    whyItMatters: 'Filing with an incorrect country of origin can result in wrong duty rates, fraudulent FTA claims, missed AD/CVD duties, and penalties under 19 U.S.C. 1592. CBP actively audits origin claims.',
    whatToDo: [
      'Determine the true country of origin — where the goods were substantially transformed.',
      'Ensure all documents reflect the same origin country.',
      'If claiming FTA benefits, ensure the FTA certificate matches the invoice origin.',
      'Correct any documents and re-upload.',
    ],
    quickActions: [
      { label: 'Upload corrected docs', type: 'upload' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 U.S.C. 1592',
    financialImpact: 'Duty difference + penalties',
  },

  // ─── Document-specific drawers ───

  power_of_attorney: {
    id: 'power_of_attorney',
    title: 'Power of Attorney',
    severity: 'critical',
    whatIsThis: 'A Power of Attorney (POA) is a legal document that authorizes a licensed customs broker to act on behalf of the importer of record when transacting customs business with CBP. Without it, the broker cannot legally file entries for you.',
    whyItMatters: 'No POA means no entry filing. CBP will not accept any entry without a valid POA on file. This is not a document that can be "worked around" — it must be executed before the broker can begin any customs work.',
    whatToDo: [
      'Execute a CBP Form 5291 (Power of Attorney) naming your customs broker.',
      'The POA must be signed by an authorized officer of the importing company.',
      'Most brokers accept electronic signatures.',
      'A continuous POA covers all future shipments — you only need to do this once per broker.',
    ],
    quickActions: [
      { label: 'Upload POA', type: 'upload', docId: 'power_of_attorney' },
      { label: 'Request from broker', type: 'request' },
    ],
    regulation: '19 CFR 141.46',
    financialImpact: 'Cannot file entry — cargo held at port',
  },

  customs_bond: {
    id: 'customs_bond',
    title: 'Continuous Customs Bond (CBP Form 301)',
    severity: 'critical',
    whatIsThis: 'A customs bond is a financial guarantee to CBP ensuring that all duties, taxes, and fees will be paid, and that all import regulations will be followed. A continuous bond covers all imports for one year. A single-entry bond covers one shipment.',
    whyItMatters: 'No bond means no entry release. CBP requires a bond before releasing any imported merchandise. If your continuous bond has lapsed, every shipment will be held until a new bond or single-entry bond is obtained — typically a 1–3 day delay.',
    whatToDo: [
      'Verify your continuous bond status with your surety company.',
      'Standard bond amount: $50,000 for most importers. Higher for certain commodities.',
      'If you need a new bond, your customs broker can arrange one through a surety — allow 1–2 business days.',
      'Upload bond confirmation showing bond number, surety company, effective dates, and bond amount.',
    ],
    quickActions: [
      { label: 'Upload bond confirmation', type: 'upload', docId: 'customs_bond' },
      { label: 'Request from surety', type: 'request' },
    ],
    regulation: '19 CFR 113',
    financialImpact: 'Cargo held at port until bond obtained',
  },

  commercial_invoice: {
    id: 'commercial_invoice',
    title: 'Commercial Invoice',
    severity: 'critical',
    whatIsThis: 'The commercial invoice is the primary document for customs entry. It must contain: seller and buyer names and addresses, detailed description of each item, quantity, unit price, total value, currency, country of origin, HTS codes, and Incoterms.',
    whyItMatters: 'CBP uses the commercial invoice to determine: (1) the correct classification and duty rate, (2) the dutiable value, (3) country of origin for trade agreement eligibility and AD/CVD, and (4) admissibility under PGA requirements. A missing or deficient invoice will cause a hold or CF-28 request.',
    whatToDo: [
      'Obtain the original commercial invoice from the seller/exporter.',
      'Verify it includes all 13 required data elements per 19 CFR 141.86.',
      'Each line item must have a specific description — not just "goods" or "merchandise."',
      'Upload the invoice and the AI will automatically extract and verify all fields.',
    ],
    quickActions: [
      { label: 'Upload commercial invoice', type: 'upload', docId: 'commercial_invoice' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '19 CFR 141.86',
    financialImpact: 'CBP hold + CF-28 delay (5–30 days)',
  },

  packing_list: {
    id: 'packing_list',
    title: 'Packing List',
    severity: 'high',
    whatIsThis: 'The packing list details how goods are physically packed: carton count, individual carton contents, weights (gross and net), dimensions, and marks/numbers that match the shipping marks on the actual cargo.',
    whyItMatters: 'CBP uses the packing list to verify cargo contents during examination. Without it, any physical exam takes longer and costs more. It is also essential for matching individual cartons to invoice line items for partial exam scenarios.',
    whatToDo: [
      'Obtain the packing list from the shipper or manufacturer.',
      'Ensure carton counts, weights, and descriptions match the commercial invoice exactly.',
      'Verify marks and numbers match what is physically printed on the cargo.',
      'Upload and the AI will cross-reference against your invoice automatically.',
    ],
    quickActions: [
      { label: 'Upload packing list', type: 'upload', docId: 'packing_list' },
      { label: 'Request from supplier', type: 'request' },
    ],
    financialImpact: 'Extended exam time + charges',
  },

  bill_of_lading: {
    id: 'bill_of_lading',
    title: 'Bill of Lading (B/L)',
    severity: 'critical',
    whatIsThis: 'The ocean bill of lading is a contract of carriage between the shipper and the ocean carrier. It serves as a receipt for cargo, a document of title, and evidence of the contract of carriage. For customs purposes, the B/L number is the primary identifier linking your cargo to the vessel manifest.',
    whyItMatters: 'Without a B/L, cargo cannot be released from the terminal. The B/L number must match the ISF and entry filing. A mismatch causes immediate holds.',
    whatToDo: [
      'Obtain the original or surrendered B/L from the carrier or freight forwarder.',
      'Verify the B/L number, container numbers, and seal numbers match your ISF filing.',
      'For telex release / surrendered B/L: confirm release status with the carrier.',
      'Upload and the AI will cross-reference against ISF and commercial invoice.',
    ],
    quickActions: [
      { label: 'Upload B/L', type: 'upload', docId: 'bill_of_lading' },
      { label: 'Request from carrier', type: 'request' },
    ],
    financialImpact: 'Cargo cannot be released',
  },

  entry_summary_7501: {
    id: 'entry_summary_7501',
    title: 'CBP Form 7501 — Entry Summary',
    severity: 'critical',
    whatIsThis: 'The Entry Summary (CBP Form 7501) is the formal customs entry document that declares the classification, value, and duty owed on imported merchandise. It must be filed within 10 working days of entry.',
    whyItMatters: 'Late filing results in liquidated damages. Inaccurate filing results in penalties under 19 U.S.C. 1592. The 7501 is the single most important document in the customs process — it determines what you pay.',
    whatToDo: [
      'Prepare the 7501 using data from the commercial invoice, packing list, and B/L.',
      'Classify all merchandise under the correct HTS codes.',
      'Calculate duties using the correct rate for each HTS code.',
      'Apply any FTA preferential rates if claiming with valid certificate of origin.',
    ],
    quickActions: [
      { label: 'Upload 7501', type: 'upload', docId: 'entry_summary_7501' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 CFR 142',
    financialImpact: 'Liquidated damages + 1592 penalties',
  },

  isf_bond: {
    id: 'isf_bond',
    title: 'ISF Bond Confirmation',
    severity: 'high',
    whatIsThis: 'The ISF bond is a separate security requirement from the customs entry bond. It guarantees CBP that ISF penalties will be paid if the filing is late or inaccurate. Most importers include ISF bond coverage in their continuous customs bond.',
    whyItMatters: 'Without ISF bond coverage, CBP will not accept your ISF filing. This means your cargo cannot be loaded on the vessel at origin, causing significant delays.',
    whatToDo: [
      'Verify with your surety company that your continuous bond includes ISF coverage.',
      'If not, obtain a separate ISF bond or rider.',
      'Confirm the bond number and upload confirmation.',
    ],
    quickActions: [
      { label: 'Upload bond confirmation', type: 'upload', docId: 'isf_bond' },
      { label: 'Request from surety', type: 'request' },
    ],
    financialImpact: 'Cargo cannot load at origin',
  },

  // ─── PGA-specific drawers ───

  fda_prior_notice: {
    id: 'fda_prior_notice',
    title: 'FDA Prior Notice',
    severity: 'critical',
    whatIsThis: 'FDA Prior Notice is a mandatory electronic filing required for all food, dietary supplements, cosmetics, drugs, and medical devices entering the United States. It must be submitted to the FDA before the shipment arrives.',
    whyItMatters: 'Failure to file Prior Notice results in automatic detention of the food article at the port. FDA can refuse admission, require re-export or destruction. There is no penalty in dollars — but the cargo is held indefinitely until resolved.',
    whatToDo: [
      'File Prior Notice through the FDA Prior Notice System Interface (PNSI) or via ABI/ACE.',
      'Filing must be done: 15 days before arrival for ocean, 4 hours before arrival for air, 2 hours before arrival for truck/rail.',
      'Required data: manufacturer, shipper, grower, FDA registration number, product description, and anticipated arrival information.',
      'Obtain a Prior Notice confirmation number and upload it here.',
    ],
    quickActions: [
      { label: 'Upload PN confirmation', type: 'upload', docId: 'fda_prior_notice' },
      { label: 'Visit FDA PNSI', type: 'link', href: 'https://www.access.fda.gov/' },
    ],
    regulation: '21 CFR 1.279',
    financialImpact: 'Automatic detention — cargo held',
  },

  fumigation_cert: {
    id: 'fumigation_cert',
    title: 'Fumigation Certificate / ISPM-15',
    severity: 'medium',
    whatIsThis: 'The ISPM-15 (International Standards for Phytosanitary Measures No. 15) certification confirms that wood packaging materials (pallets, crates, dunnage) have been treated to prevent the spread of invasive pests. The fumigation certificate confirms chemical treatment of the cargo or packaging.',
    whyItMatters: 'Non-compliant wood packaging triggers USDA/APHIS action: the container is held, the importer pays for treatment or re-export, and a notice of non-compliance is issued. Repeat violations escalate to automatic holds on all future shipments.',
    whatToDo: [
      'Confirm with your supplier that all wood packaging bears the ISPM-15 stamp (wheat sheaf mark).',
      'If fumigation was performed, obtain the fumigation certificate from the treatment provider.',
      'The certificate must show: treatment method (heat treatment HT or methyl bromide MB), treatment date, and provider identification.',
      'If using non-wood packaging (plastic pallets, metal), this requirement does not apply.',
    ],
    quickActions: [
      { label: 'Upload certificate', type: 'upload', docId: 'fumigation_cert' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
    ],
    regulation: 'ISPM-15 / 7 CFR 319.40',
    financialImpact: 'Container held + treatment/re-export costs',
  },

  section_301: {
    id: 'section_301',
    title: 'Section 301 Tariff Determination',
    severity: 'high',
    whatIsThis: 'Section 301 tariffs are additional duties imposed on goods originating from China, on top of the normal Column 1 duty rate. The additional rate ranges from 7.5% to 25% depending on the product list (List 1, 2, 3, or 4A).',
    whyItMatters: 'Failure to declare Section 301 duties results in underpayment, which CBP will discover during liquidation review. This triggers a penalty case under 19 U.S.C. 1592 plus interest on the underpaid amount.',
    whatToDo: [
      'Verify your HTS code against the current Section 301 product lists at USTR.gov.',
      'Determine the applicable additional duty rate (7.5%, 15%, or 25%).',
      'Check if any exclusions have been granted for your specific product.',
      'Include the Section 301 additional duty in your entry summary calculations.',
    ],
    quickActions: [
      { label: 'Check USTR product lists', type: 'link', href: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'Section 301 Trade Act of 1974',
    financialImpact: '7.5%–25% additional duty',
  },

  adcvd_check: {
    id: 'adcvd_check',
    title: 'AD/CVD Order Check',
    severity: 'high',
    whatIsThis: 'Antidumping (AD) and Countervailing Duty (CVD) orders impose additional duties on products that are being sold in the U.S. at less than fair value (dumping) or are subsidized by a foreign government. These are separate from normal duties and can be very large.',
    whyItMatters: 'AD/CVD duties can range from 0% to over 200%. Failure to identify and pay AD/CVD duties results in liquidated damages, additional duty assessments during annual reviews, and potential evasion penalties under the EAPA (Enforce and Protect Act).',
    whatToDo: [
      'Check your HTS code against active AD/CVD orders at the ITC AD/CVD database.',
      'If subject to an order, determine the applicable deposit rate for the manufacturer/exporter.',
      'Ensure the entry summary includes the correct AD/CVD case number and deposit rate.',
      'Cash deposits are required at time of entry — these are adjusted during annual administrative reviews.',
    ],
    quickActions: [
      { label: 'Check ITC database', type: 'link', href: 'https://www.usitc.gov/trade_remedy/731_702.htm' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 U.S.C. 1673 (AD) / 19 U.S.C. 1671 (CVD)',
    financialImpact: '0%–200%+ additional duties',
  },

  sima_license: {
    id: 'sima_license',
    title: 'SIMA Steel Import License',
    severity: 'critical',
    whatIsThis: 'The Steel Import Monitoring and Analysis (SIMA) license is required for all imports of basic steel mill products into the United States. The license is free and issued automatically through the SIMA licensing system, but must be obtained before the entry summary is filed.',
    whyItMatters: 'CBP will reject entry summaries for steel products that do not include a valid SIMA license number. This causes processing delays and potential liquidated damages for late filing.',
    whatToDo: [
      'Apply for a SIMA license through the Commerce Department\'s online system.',
      'Licenses are issued automatically and are valid for 75 days.',
      'Include the license number on your CBP Form 7501 entry summary.',
      'You need one license per entry — not per shipment.',
    ],
    quickActions: [
      { label: 'Apply for SIMA license', type: 'link', href: 'https://enforcement.trade.gov/steel/license/' },
      { label: 'Upload license', type: 'upload', docId: 'sima_license' },
    ],
    regulation: '19 CFR 360',
    financialImpact: 'Entry rejection + filing delay',
  },

  // ─── Fee drawers ───

  mpf_calc: {
    id: 'mpf_calc',
    title: 'Merchandise Processing Fee (MPF)',
    severity: 'info',
    whatIsThis: 'The MPF is a fee assessed by CBP on most formal entries (valued over $2,500). It is calculated as 0.3464% of the declared value, with a minimum of $31.67 and a maximum of $614.35 per entry.',
    whyItMatters: 'MPF is collected with duty payment. It is a mandatory fee — there is no exemption. For informal entries (under $2,500), a flat $2.00, $6.00, or $9.00 fee applies instead.',
    whatToDo: [
      'MPF is auto-calculated based on your declared value.',
      'Ensure your declared value is accurate — MPF adjusts with post-summary corrections.',
      'FTA entries are generally exempt from MPF (e.g., USMCA). Verify FTA eligibility.',
    ],
    quickActions: [
      { label: 'View duty calculator', type: 'navigate', href: '/compliance' },
    ],
    regulation: '19 U.S.C. 58c',
  },

  hmf_calc: {
    id: 'hmf_calc',
    title: 'Harbor Maintenance Fee (HMF)',
    severity: 'info',
    whatIsThis: 'The HMF is a fee assessed on all ocean cargo entering U.S. ports. It is calculated as 0.125% of the cargo value and is used to fund harbor maintenance and dredging.',
    whyItMatters: 'HMF applies only to ocean imports — air cargo is exempt. It is collected with duty payment on the entry summary.',
    whatToDo: [
      'HMF is auto-calculated based on your declared value for ocean shipments.',
      'No action required — this is an informational calculation.',
    ],
    quickActions: [
      { label: 'View fee breakdown', type: 'navigate', href: '/compliance' },
    ],
    regulation: '19 U.S.C. 24',
  },

  restricted_party_screening: {
    id: 'restricted_party_screening',
    title: 'Restricted Party Screening',
    severity: 'high',
    whatIsThis: 'Restricted Party Screening checks all parties in the transaction (buyer, seller, consignee, manufacturer, end-user) against five U.S. government denied/restricted party lists: BIS Entity List, OFAC SDN List, State Department Debarred List, BIS Denied Persons List, and the Unverified List.',
    whyItMatters: 'Transacting with a denied or restricted party is a serious criminal and civil violation. Penalties range from $250,000 to $1,000,000 per violation, plus up to 20 years imprisonment. This screening is legally required for all U.S. imports and exports.',
    whatToDo: [
      'Orchestra automatically runs screening on shipment creation against all 5 lists.',
      'If a match is found, do NOT proceed with the shipment until cleared.',
      'Contact your compliance officer or legal counsel immediately if a potential match is identified.',
      'False positives require documentation — save the screening result showing the match was reviewed and cleared.',
    ],
    quickActions: [
      { label: 'View screening results', type: 'navigate', href: '/compliance' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'EAR 15 CFR 730-774 / OFAC 31 CFR 500',
    financialImpact: '$250,000–$1,000,000 per violation + criminal penalties',
  },

  // ─── Remaining document-specific drawers ───

  importer_registration: {
    id: 'importer_registration',
    title: 'Importer of Record Registration',
    severity: 'critical',
    whatIsThis: 'The Importer of Record (IOR) must be registered with CBP before any entries can be filed. This involves obtaining an Importer Number, which is either the importer\'s IRS Employer Identification Number (EIN) or a CBP-assigned number.',
    whyItMatters: 'Without a valid Importer Number, CBP will not accept any entry filing. The IOR is legally responsible for all duties, taxes, fees, and compliance with all import laws — even if a broker is handling the paperwork.',
    whatToDo: [
      'If the importer has an EIN (IRS tax ID), this can be used as the Importer Number.',
      'If no EIN, file CBP Form 5106 to obtain a CBP-assigned importer number.',
      'First-time importers should register through ACE (Automated Commercial Environment).',
      'Upload confirmation of registration to this slot.',
    ],
    quickActions: [
      { label: 'Upload registration', type: 'upload', docId: 'importer_registration' },
      { label: 'Visit ACE portal', type: 'link', href: 'https://ace.cbp.dhs.gov/' },
    ],
    regulation: '19 CFR 24.5',
    financialImpact: 'Cannot file entry — cargo held at port',
  },

  ach_authorization: {
    id: 'ach_authorization',
    title: 'ACH Payment Authorization',
    severity: 'medium',
    whatIsThis: 'ACH (Automated Clearing House) is the electronic payment system used to pay customs duties, taxes, and fees to CBP. The ACH authorization allows CBP to debit the importer\'s bank account directly for duty payments.',
    whyItMatters: 'Without ACH setup, duty payments must be made by certified check or cash — significantly slower and may delay cargo release. ACH is required for periodic monthly statements and reconciliation entries.',
    whatToDo: [
      'Complete CBP Form 400 (ACH Debit Authorization) with your bank details.',
      'Submit the form to your CBP-assigned Revenue Division.',
      'Allow 10–15 business days for ACH enrollment to process.',
      'Once active, duties are debited automatically on the 15th working day after entry summary filing.',
    ],
    quickActions: [
      { label: 'Upload ACH form', type: 'upload', docId: 'ach_authorization' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 CFR 24.25',
    financialImpact: 'Slower duty processing — potential release delays',
  },

  reconciliation_rider: {
    id: 'reconciliation_rider',
    title: 'Reconciliation Bond Rider',
    severity: 'medium',
    whatIsThis: 'A Reconciliation Bond Rider extends your continuous customs bond to cover reconciliation entries. Reconciliation is a CBP program that allows importers to file entry summaries with estimated data and then "reconcile" the final data later (e.g., when final value, classification, or FTA eligibility is determined).',
    whyItMatters: 'If you participate in the Reconciliation program and your bond does not have the rider, CBP will reject your reconciliation filings. This results in late filing penalties and potential liquidation at the estimated (often higher) rate.',
    whatToDo: [
      'Contact your surety company and request a reconciliation rider on your continuous bond.',
      'The rider is typically available at no additional cost or a minimal fee.',
      'Upload confirmation that the rider is active.',
    ],
    quickActions: [
      { label: 'Upload rider confirmation', type: 'upload', docId: 'reconciliation_rider' },
      { label: 'Request from surety', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
    ],
    regulation: '19 CFR 113.62',
    financialImpact: 'Reconciliation filings rejected',
  },

  air_waybill: {
    id: 'air_waybill',
    title: 'Air Waybill (AWB)',
    severity: 'critical',
    whatIsThis: 'The air waybill is the air freight equivalent of an ocean bill of lading. It is a contract of carriage between the shipper and the airline, and serves as the primary identification document for air cargo shipments.',
    whyItMatters: 'The AWB number is required on the entry filing and must match the manifest data filed with CBP through the Air Automated Manifest System (AAMS). Without a matching AWB, cargo cannot be released.',
    whatToDo: [
      'Obtain the air waybill from your freight forwarder or airline.',
      'Verify the AWB number matches your booking confirmation.',
      'Check that the shipper, consignee, and cargo description match your commercial invoice.',
      'Upload and the AI will cross-reference against your commercial invoice.',
    ],
    quickActions: [
      { label: 'Upload AWB', type: 'upload', docId: 'air_waybill' },
      { label: 'Request from forwarder', type: 'request' },
    ],
    financialImpact: 'Cargo cannot be released',
  },

  insurance_certificate: {
    id: 'insurance_certificate',
    title: 'Insurance Certificate',
    severity: 'medium',
    whatIsThis: 'The insurance certificate provides evidence that the cargo is insured during transit. For CIF or CIP shipments, the insurance cost is part of the dutiable value and must be added to the customs valuation.',
    whyItMatters: 'Under CIF/CIP Incoterms, insurance costs must be included in the declared value. Omitting insurance from the value is an undervaluation that can trigger a CF-28 request or penalty under 19 U.S.C. 1592.',
    whatToDo: [
      'Obtain the insurance certificate or policy from the seller or insurance provider.',
      'Verify the coverage amount and currency match the commercial invoice value.',
      'Add the insurance cost to the dutiable value on the entry summary.',
      'Upload the certificate to complete your CIF documentation.',
    ],
    quickActions: [
      { label: 'Upload certificate', type: 'upload', docId: 'insurance_certificate' },
      { label: 'Request from seller', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
    ],
    regulation: '19 CFR 152.103',
    financialImpact: 'Undervaluation penalty risk',
  },

  pro_forma_invoice: {
    id: 'pro_forma_invoice',
    title: 'Pro Forma Invoice',
    severity: 'low',
    whatIsThis: 'A pro forma invoice is a preliminary invoice issued before the final commercial invoice is available. It provides estimated values, descriptions, and terms that allow customs processing to begin while the final invoice is pending.',
    whyItMatters: 'Filing with a pro forma invoice is acceptable under 19 CFR 141.86, but a Post Summary Correction (PSC) must be filed once the final invoice is available. If the final value differs significantly, duty adjustments and interest may apply.',
    whatToDo: [
      'Use the pro forma invoice to begin the entry process if the final invoice is not yet available.',
      'Mark the entry as "pro forma" so the broker files a Post Summary Correction when the final invoice arrives.',
      'Upload the pro forma now, then replace with the final commercial invoice when received.',
    ],
    quickActions: [
      { label: 'Upload pro forma', type: 'upload', docId: 'pro_forma_invoice' },
      { label: 'Request from supplier', type: 'request' },
    ],
    financialImpact: 'Duty adjustment + interest if values change',
  },

  purchase_order: {
    id: 'purchase_order',
    title: 'Purchase Order / Sales Contract',
    severity: 'medium',
    whatIsThis: 'The purchase order or sales contract documents the agreed terms of sale between buyer and seller: quantities, prices, delivery terms, and payment conditions. It serves as the foundational agreement against which all other shipment documents are verified.',
    whyItMatters: 'CBP may request the PO during a CF-28 audit to verify the transaction value. The PO is also critical for identifying related-party transactions, assists, and royalty payments that must be added to the dutiable value.',
    whatToDo: [
      'Upload the original purchase order or signed sales contract.',
      'Verify that quantities, prices, and terms match the commercial invoice.',
      'If amendments were made, include the amendment documents.',
      'Keep on file for 5 years per record-keeping requirements.',
    ],
    quickActions: [
      { label: 'Upload PO', type: 'upload', docId: 'purchase_order' },
      { label: 'Request from buyer', type: 'request' },
    ],
    regulation: '19 CFR 163',
    financialImpact: 'CF-28 response complications',
  },

  ams_verification: {
    id: 'ams_verification',
    title: 'AMS Data Match Verification',
    severity: 'medium',
    whatIsThis: 'The Automated Manifest System (AMS) data is filed by the carrier/vessel operator with CBP before vessel arrival. AMS verification confirms that the manifest data matches your ISF and B/L data — particularly container numbers, seal numbers, and bill of lading numbers.',
    whyItMatters: 'AMS mismatches trigger automatic holds in CBP\'s targeting system. The vessel cannot discharge your container if AMS data does not match the ISF filing.',
    whatToDo: [
      'Verify with your carrier that AMS has been filed and matches your B/L data.',
      'If discrepancies exist, request the carrier to amend the AMS filing.',
      'Upload carrier confirmation of AMS filing.',
    ],
    quickActions: [
      { label: 'Upload AMS confirmation', type: 'upload', docId: 'ams_verification' },
      { label: 'Request from carrier', type: 'request' },
    ],
    financialImpact: 'Container hold at port',
  },

  arrival_notice: {
    id: 'arrival_notice',
    title: 'Arrival Notice',
    severity: 'medium',
    whatIsThis: 'The arrival notice is issued by the ocean carrier or their agent notifying the consignee of the vessel\'s expected arrival. It includes free time allowance, per diem rates, and terminal contact information.',
    whyItMatters: 'The arrival notice starts the free time clock. Missing it means you may not know when demurrage charges begin. It also contains terminal information needed for drayage pickup.',
    whatToDo: [
      'Contact your freight forwarder or carrier to obtain the arrival notice.',
      'Note the free time expiration date and set a reminder.',
      'Arrange trucking/drayage before free time expires.',
      'Upload the notice and the system will track free time automatically.',
    ],
    quickActions: [
      { label: 'Upload arrival notice', type: 'upload', docId: 'arrival_notice' },
      { label: 'Request from carrier', type: 'request' },
    ],
    financialImpact: '$150–$350/day demurrage after free time',
  },

  entry_3461: {
    id: 'entry_3461',
    title: 'CBP Form 3461 — Entry/Immediate Delivery',
    severity: 'critical',
    whatIsThis: 'CBP Form 3461 is the initial entry document that requests release of cargo from CBP custody. It provides basic information about the shipment to allow CBP to make a release determination. Filing the 3461 triggers the 10-business-day clock for filing the Entry Summary (7501).',
    whyItMatters: 'Without a 3461, cargo remains in CBP custody at the port. The 3461 must be filed before cargo can be released. For perishable goods, delays can result in spoilage and total loss.',
    whatToDo: [
      'File the 3461 through ABI/ACE with basic shipment data.',
      'Include: importer number, entry type, port of entry, carrier code, B/L number, HTS codes, and country of origin.',
      'Once CBP releases the 3461, the 10-business-day clock starts for the 7501.',
      'Upload the filed 3461 confirmation.',
    ],
    quickActions: [
      { label: 'Upload 3461', type: 'upload', docId: 'entry_3461' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '19 CFR 142.3',
    financialImpact: 'Cargo held in CBP custody',
  },

  hts_worksheet: {
    id: 'hts_worksheet',
    title: 'HTS Classification Worksheet',
    severity: 'medium',
    whatIsThis: 'The HTS Classification Worksheet documents the rationale for classifying your merchandise under specific Harmonized Tariff Schedule (HTS) codes. It shows the General Rules of Interpretation (GRI) analysis used to arrive at the correct classification.',
    whyItMatters: 'Proper classification documentation protects you during CBP audits. If CBP challenges your classification, a well-documented worksheet demonstrates reasonable care under 19 U.S.C. 1484. Without it, penalties for misclassification are harder to mitigate.',
    whatToDo: [
      'Document the classification analysis for each product in the shipment.',
      'Apply the General Rules of Interpretation (GRI 1-6) in order.',
      'Consider requesting a binding ruling from CBP (Form 177) for complex products.',
      'Keep the worksheet on file for 5 years.',
    ],
    quickActions: [
      { label: 'Upload worksheet', type: 'upload', docId: 'hts_worksheet' },
      { label: 'Open classification tool', type: 'navigate', href: '/product-classification' },
    ],
    regulation: '19 U.S.C. 1484 / GRI 1-6',
    financialImpact: 'Misclassification penalties',
  },

  delivery_order: {
    id: 'delivery_order',
    title: 'Delivery Order',
    severity: 'medium',
    whatIsThis: 'The delivery order authorizes the terminal or CFS to release the cargo to a specified trucking company. It is issued by the carrier or their agent after the B/L has been surrendered and freight charges paid.',
    whyItMatters: 'Without a delivery order, the terminal will not release the container to your trucker, even if CBP has cleared the cargo. This is one of the most common causes of unnecessary demurrage charges.',
    whatToDo: [
      'Request the delivery order from the carrier or freight forwarder once the B/L is surrendered.',
      'Verify freight charges are paid — the carrier will not issue a D/O until freight is settled.',
      'Provide the D/O to your trucking company for pickup.',
      'Upload the D/O to track the release process.',
    ],
    quickActions: [
      { label: 'Upload D/O', type: 'upload', docId: 'delivery_order' },
      { label: 'Request from carrier', type: 'request' },
    ],
    financialImpact: 'Demurrage charges if delayed',
  },

  ach_duty_payment: {
    id: 'ach_duty_payment',
    title: 'ACH Duty Payment Authorization',
    severity: 'medium',
    whatIsThis: 'This authorizes the ACH debit for the specific duty payment on this entry. Duties are debited on the 15th working day after the entry summary (7501) is filed.',
    whyItMatters: 'If the ACH payment fails (insufficient funds, account issues), CBP will issue a demand for payment and assess interest. Repeated ACH failures can result in your ACH privileges being revoked.',
    whatToDo: [
      'Verify sufficient funds are available in the ACH-linked account.',
      'Confirm the duty amount matches your entry summary calculations.',
      'If the ACH setup is not active, arrange alternative payment (certified check).',
    ],
    quickActions: [
      { label: 'Upload payment confirmation', type: 'upload', docId: 'ach_duty_payment' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Interest on late payment',
  },

  country_of_origin: {
    id: 'country_of_origin',
    title: 'Country of Origin Declaration',
    severity: 'high',
    whatIsThis: 'The Country of Origin Declaration certifies where the goods were manufactured or substantially transformed. This determines the applicable duty rate, FTA eligibility, AD/CVD applicability, and any Section 301 additional tariffs.',
    whyItMatters: 'An incorrect country of origin can result in wrong duty rates, missed AD/CVD deposits (potentially 200%+ additional duty), invalid FTA claims, and 19 U.S.C. 1592 penalties for material false statements.',
    whatToDo: [
      'Obtain a signed declaration from the manufacturer or supplier confirming where the goods were made.',
      'Verify the origin matches all other documents (invoice, B/L, ISF, FTA cert).',
      'For goods with components from multiple countries, determine where substantial transformation occurred.',
      'Upload the declaration to this slot.',
    ],
    quickActions: [
      { label: 'Upload declaration', type: 'upload', docId: 'country_of_origin' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '19 CFR 102 / 19 U.S.C. 1304',
    financialImpact: 'Wrong duty rates + penalties',
  },

  manufacturer_affidavit: {
    id: 'manufacturer_affidavit',
    title: "Manufacturer's Affidavit / Supplier Declaration",
    severity: 'medium',
    whatIsThis: 'A manufacturer\'s affidavit or supplier declaration is a signed statement from the manufacturer confirming the materials used, manufacturing process, and origin of the goods. It supports your classification and valuation claims.',
    whyItMatters: 'CBP may request this document during a CF-28 audit to verify your classification, origin, or value claims. Having it ready speeds up the response and demonstrates reasonable care.',
    whatToDo: [
      'Request a detailed affidavit from the manufacturer on their letterhead.',
      'It should describe: materials used, manufacturing process, country of manufacture, and product specifications.',
      'For FTA claims, the affidavit should confirm origin criteria are met.',
      'Keep on file for 5 years per 19 CFR 163.',
    ],
    quickActions: [
      { label: 'Upload affidavit', type: 'upload', docId: 'manufacturer_affidavit' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '19 CFR 163',
    financialImpact: 'CF-28 response complications',
  },

  fda_affirmation: {
    id: 'fda_affirmation',
    title: 'FDA Entry Affirmation of Compliance',
    severity: 'critical',
    whatIsThis: 'FDA Affirmation of Compliance codes are required on the CBP entry for FDA-regulated products. These codes affirm that the imported product complies with applicable FDA requirements (registration, labeling, safety).',
    whyItMatters: 'Missing or incorrect affirmation codes trigger automatic FDA review, which can hold your cargo for 5–30 days. For medical devices and pharmaceuticals, release without proper affirmation is a criminal violation.',
    whatToDo: [
      'Determine the correct FDA Affirmation of Compliance code for your product.',
      'Include the code in the PGA message set on your entry filing.',
      'Verify FDA facility registration is current for the manufacturer.',
      'Upload documentation confirming compliance.',
    ],
    quickActions: [
      { label: 'Upload FDA compliance', type: 'upload', docId: 'fda_affirmation' },
      { label: 'Check FDA registration', type: 'link', href: 'https://www.fda.gov/medical-devices/device-registration-and-listing' },
    ],
    regulation: '21 CFR Parts 807, 820',
    financialImpact: 'FDA detention — 5-30 day hold',
  },

  usda_permit: {
    id: 'usda_permit',
    title: 'USDA/APHIS Import Permit',
    severity: 'critical',
    whatIsThis: 'USDA/APHIS import permits are required for agricultural products, live animals, and plants to prevent the introduction of foreign pests and diseases into the United States.',
    whyItMatters: 'Importing agricultural products without the required USDA permit results in automatic seizure and destruction of the goods. There is no option to re-export — the goods are destroyed at the importer\'s expense.',
    whatToDo: [
      'Apply for the appropriate USDA/APHIS permit well in advance (processing can take 2–4 weeks).',
      'Different permits apply: PPQ 525 for plants, VS 17-129 for animals, etc.',
      'The permit must be valid at time of arrival.',
      'Upload the issued permit to this slot.',
    ],
    quickActions: [
      { label: 'Upload permit', type: 'upload', docId: 'usda_permit' },
      { label: 'Apply at APHIS', type: 'link', href: 'https://www.aphis.usda.gov/aphis/ourfocus/importexport' },
    ],
    regulation: '7 CFR 319 / 9 CFR 92-96',
    financialImpact: 'Goods seized and destroyed',
  },

  phytosanitary: {
    id: 'phytosanitary',
    title: 'Phytosanitary Certificate',
    severity: 'high',
    whatIsThis: 'A phytosanitary certificate is issued by the plant protection organization of the exporting country. It certifies that the plants, seeds, or wood products have been inspected and are free from regulated pests.',
    whyItMatters: 'USDA/APHIS requires phytosanitary certificates for most plant products. Without one, goods are held for inspection and potential treatment at the importer\'s expense, or refused entry.',
    whatToDo: [
      'Request the phytosanitary certificate from your supplier — it must be issued by the government plant protection agency of the origin country.',
      'The certificate must be original (not a copy) and issued within 14 days of shipment.',
      'Verify it covers the specific plants/products in the shipment.',
      'Upload the certificate before cargo arrival.',
    ],
    quickActions: [
      { label: 'Upload certificate', type: 'upload', docId: 'phytosanitary' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '7 CFR 319',
    financialImpact: 'Goods held/treated/refused at importer expense',
  },

  cites_permit: {
    id: 'cites_permit',
    title: 'CITES Permit',
    severity: 'critical',
    whatIsThis: 'CITES (Convention on International Trade in Endangered Species) permits are required for the import or export of species listed under CITES Appendices I, II, or III. This includes certain wildlife, exotic leathers, timber species, and derived products.',
    whyItMatters: 'Importing CITES-listed species without proper permits is a federal crime under the Lacey Act and Endangered Species Act. Penalties include fines up to $50,000 per violation and imprisonment. Goods are seized and forfeited.',
    whatToDo: [
      'Determine if your product contains CITES-listed species (check the CITES species database).',
      'Obtain both an export permit from the origin country AND an import permit from U.S. Fish & Wildlife Service.',
      'Shipments must enter through a CITES-designated port.',
      'Upload all permits before shipment.',
    ],
    quickActions: [
      { label: 'Upload CITES permit', type: 'upload', docId: 'cites_permit' },
      { label: 'Check CITES species', type: 'link', href: 'https://checklist.cites.org/' },
    ],
    regulation: 'Lacey Act / ESA / 50 CFR 23',
    financialImpact: 'Seizure + $50,000 fine + criminal penalties',
  },

  epa_tsca: {
    id: 'epa_tsca',
    title: 'EPA TSCA Certification',
    severity: 'high',
    whatIsThis: 'The Toxic Substances Control Act (TSCA) requires importers of chemical substances to certify that their products either comply with TSCA or are not subject to TSCA. This certification is filed with CBP at the time of entry.',
    whyItMatters: 'Importing chemical substances without TSCA certification triggers EPA holds and potential penalties of up to $37,500 per day of violation.',
    whatToDo: [
      'Determine if your chemical substances are on the TSCA Inventory (positive certification) or exempt (negative certification).',
      'Include the appropriate TSCA certification statement on or with the entry filing.',
      'Upload documentation of compliance.',
    ],
    quickActions: [
      { label: 'Upload TSCA cert', type: 'upload', docId: 'epa_tsca' },
      { label: 'Check TSCA inventory', type: 'link', href: 'https://www.epa.gov/tsca-inventory' },
    ],
    regulation: '15 U.S.C. 2601 / 40 CFR 707',
    financialImpact: '$37,500/day + EPA hold',
  },

  epa_3520: {
    id: 'epa_3520',
    title: 'EPA Form 3520-1 (Vehicle/Engine)',
    severity: 'high',
    whatIsThis: 'EPA Form 3520-1 is required for all motor vehicles and engines imported into the United States. It certifies compliance with EPA emissions standards.',
    whyItMatters: 'Vehicles and engines cannot be entered without this form. Non-compliant vehicles must be modified, exported, or destroyed. CBP will not release the vehicle from custody without EPA clearance.',
    whatToDo: [
      'Complete EPA Form 3520-1 with the vehicle identification number (VIN), engine family, and emissions standard.',
      'Determine the appropriate import code (conforming, non-conforming, test/display, etc.).',
      'For non-conforming vehicles, arrange for an EPA-approved Independent Commercial Importer (ICI) to modify the vehicle.',
      'Upload the completed form.',
    ],
    quickActions: [
      { label: 'Upload EPA form', type: 'upload', docId: 'epa_3520' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: '40 CFR 85.1501',
    financialImpact: 'Vehicle held/exported/destroyed',
  },

  fcc_declaration: {
    id: 'fcc_declaration',
    title: 'FCC Declaration',
    severity: 'medium',
    whatIsThis: 'The FCC Declaration of Conformity (DoC) confirms that electronic devices and radio frequency equipment comply with FCC technical standards for electromagnetic emissions and radio interference.',
    whyItMatters: 'Non-compliant electronic devices can be refused entry by CBP acting on behalf of the FCC. For large shipments of consumer electronics, this can represent significant financial loss.',
    whatToDo: [
      'Verify your product has been tested and certified to applicable FCC standards.',
      'Obtain the FCC DoC, test report, or FCC ID from the manufacturer.',
      'Include the FCC compliance information in the entry filing.',
      'Upload the declaration or test report.',
    ],
    quickActions: [
      { label: 'Upload FCC declaration', type: 'upload', docId: 'fcc_declaration' },
      { label: 'Request from manufacturer', type: 'request' },
    ],
    regulation: '47 CFR Part 15',
    financialImpact: 'Products refused entry',
  },

  cpsc_cert: {
    id: 'cpsc_cert',
    title: 'CPSC Compliance Certificate',
    severity: 'high',
    whatIsThis: 'The Consumer Product Safety Commission (CPSC) requires a General Certificate of Conformity (GCC) for consumer products, or a Children\'s Product Certificate (CPC) for products designed for children 12 and under, certifying compliance with applicable safety standards.',
    whyItMatters: 'CPSC-regulated products imported without proper certification can be detained, seized, or recalled. For children\'s products, third-party testing is mandatory and the CPC must reference specific test reports.',
    whatToDo: [
      'Determine which CPSC standards apply to your product (16 CFR).',
      'For children\'s products: obtain third-party test reports from a CPSC-accepted lab.',
      'Issue or obtain a GCC (consumer products) or CPC (children\'s products) from the manufacturer or importer.',
      'File the certificate with CBP as part of the entry process.',
    ],
    quickActions: [
      { label: 'Upload certificate', type: 'upload', docId: 'cpsc_cert' },
      { label: 'Request from manufacturer', type: 'request' },
    ],
    regulation: '15 U.S.C. 2063',
    financialImpact: 'Products detained/seized/recalled',
  },

  atf_form_6: {
    id: 'atf_form_6',
    title: 'ATF Form 6 — Import Permit',
    severity: 'critical',
    whatIsThis: 'ATF Form 6 (Application and Permit for Importation of Firearms, Ammunition and Implements of War) must be approved by the Bureau of Alcohol, Tobacco, Firearms and Explosives before importing firearms or ammunition into the United States.',
    whyItMatters: 'Importing firearms or ammunition without an approved ATF Form 6 is a federal crime punishable by up to 10 years imprisonment and $250,000 in fines. CBP will seize the goods and refer the case to ATF for criminal investigation.',
    whatToDo: [
      'Submit ATF Form 6 to the ATF Firearms and Explosives Imports Branch.',
      'Allow 4–6 weeks for processing (more for large quantities).',
      'The permit must be approved before the goods are shipped.',
      'Present the approved Form 6 to CBP at the port of entry.',
    ],
    quickActions: [
      { label: 'Upload ATF permit', type: 'upload', docId: 'atf_form_6' },
      { label: 'ATF forms page', type: 'link', href: 'https://www.atf.gov/firearms/import-firearms-ammunition-and-implements-war' },
    ],
    regulation: '27 CFR 447',
    financialImpact: 'Seizure + criminal prosecution',
  },

  textile_visa: {
    id: 'textile_visa',
    title: 'Textile Visa / Quota Documentation',
    severity: 'high',
    whatIsThis: 'Textile visas are export endorsements issued by the government of the exporting country that certify the textiles/apparel comply with any applicable quota or trade agreement requirements. Some countries require textile visas for specific categories.',
    whyItMatters: 'Textiles imported from certain countries without the required visa stamp will be refused entry. This results in re-export at the importer\'s expense or storage pending resolution.',
    whatToDo: [
      'Determine if a textile visa is required for your specific textile category and country of origin.',
      'The visa stamp must appear on the commercial invoice from the exporting country\'s government.',
      'Verify the textile category number matches the goods being imported.',
      'Upload the visa-stamped invoice.',
    ],
    quickActions: [
      { label: 'Upload textile visa', type: 'upload', docId: 'textile_visa' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '19 CFR 132',
    financialImpact: 'Entry refused — re-export required',
  },

  sds_msds: {
    id: 'sds_msds',
    title: 'SDS / MSDS Safety Data Sheets',
    severity: 'high',
    whatIsThis: 'Safety Data Sheets (SDS, formerly MSDS) are required documents that describe the hazardous properties of chemical substances, proper handling procedures, emergency response measures, and regulatory information.',
    whyItMatters: 'SDS are required by OSHA, DOT, and EPA for all hazardous materials. Without proper SDS, the shipment may be classified as "unknown hazardous material" — which triggers DOT violations, port refusal, and potential evacuation protocols.',
    whatToDo: [
      'Obtain the current 16-section SDS from the manufacturer or chemical supplier.',
      'Verify the SDS is in English and follows the GHS (Globally Harmonized System) format.',
      'Ensure the SDS covers the exact product and formulation being shipped.',
      'Upload the SDS to document hazmat compliance.',
    ],
    quickActions: [
      { label: 'Upload SDS', type: 'upload', docId: 'sds_msds' },
      { label: 'Request from supplier', type: 'request' },
    ],
    regulation: '29 CFR 1910.1200 / 49 CFR 171',
    financialImpact: 'DOT violations + port refusal',
  },

  denied_party_cert: {
    id: 'denied_party_cert',
    title: 'Denied Party Screening Certificate (Export)',
    severity: 'critical',
    whatIsThis: 'For U.S. exports, a denied party screening must be performed against all U.S. government restricted party lists. The screening certificate documents that all parties in the transaction have been checked and are not on any denied/restricted lists.',
    whyItMatters: 'Exporting to a denied party is a criminal offense with penalties up to $1,000,000 per violation and 20 years imprisonment under the Export Control Reform Act (ECRA).',
    whatToDo: [
      'Screen all parties: consignee, end-user, intermediate consignee, and any other parties.',
      'Check against: BIS Entity List, OFAC SDN List, State Debarred List, BIS Denied Persons, Unverified List.',
      'Document the screening results with timestamp.',
      'If a match is found, do not proceed — contact your export compliance officer or legal counsel.',
    ],
    quickActions: [
      { label: 'Upload screening results', type: 'upload', docId: 'denied_party_cert' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'ECRA / EAR 15 CFR 730-774',
    financialImpact: '$1,000,000 + 20 years imprisonment',
  },

  estimated_duties: {
    id: 'estimated_duties',
    title: 'Estimated Duties Calculation',
    severity: 'info',
    whatIsThis: 'This is the estimated total duties owed on this shipment, calculated using the HTS duty rate applied to the declared value. It includes normal Column 1 duties plus any applicable AD/CVD deposits, Section 301 tariffs, and other additional duties.',
    whyItMatters: 'Accurate duty estimation is essential for cash flow planning and for verifying the entry summary is correct before filing. Underpayment results in interest; significant underpayment triggers penalties.',
    whatToDo: [
      'Review the duty calculation for accuracy.',
      'Verify the HTS classification and duty rate are correct.',
      'Check for applicable FTA preferential rates that could reduce duties.',
      'Confirm any AD/CVD or Section 301 additional duties are included.',
    ],
    quickActions: [
      { label: 'View duty calculator', type: 'navigate', href: '/compliance' },
    ],
    regulation: '19 U.S.C. 1505',
  },
};

// ─── Dynamic drawer generation for any alert ───

export function getDrawerContent(alertId: string, context?: {
  docName?: string;
  severity?: string;
  message?: string;
  shipmentMode?: string;
  originCountry?: string;
  destCountry?: string;
  declaredValue?: string;
  hsCode?: string;
}): AlertDrawerData {
  // Check built-in templates first
  if (DRAWER_TEMPLATES[alertId]) {
    return DRAWER_TEMPLATES[alertId];
  }

  // Generate drawer for cross-ref discrepancy messages
  if (context?.message) {
    const msg = context.message.toLowerCase();

    if (msg.includes('description') && msg.includes('mismatch')) {
      return DRAWER_TEMPLATES['description_mismatch'];
    }
    if (msg.includes('weight') && (msg.includes('mismatch') || msg.includes('discrepancy'))) {
      return DRAWER_TEMPLATES['weight_mismatch'];
    }
    if (msg.includes('value') && (msg.includes('mismatch') || msg.includes('discrepancy'))) {
      return DRAWER_TEMPLATES['value_mismatch'];
    }
    if (msg.includes('consignee') && msg.includes('mismatch')) {
      return DRAWER_TEMPLATES['consignee_mismatch'];
    }
    if (msg.includes('hts') || msg.includes('hs code') || msg.includes('classification')) {
      return DRAWER_TEMPLATES['hts_mismatch'];
    }
    if (msg.includes('container') || msg.includes('seal')) {
      return DRAWER_TEMPLATES['container_seal_mismatch'];
    }
    if (msg.includes('origin') && msg.includes('mismatch')) {
      return DRAWER_TEMPLATES['origin_mismatch'];
    }
  }

  // Fallback: generate a generic but useful drawer
  return {
    id: alertId,
    title: context?.docName || alertId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    severity: (context?.severity as any) || 'medium',
    whatIsThis: `This is a requirement for your ${context?.shipmentMode || 'customs'} shipment${context?.originCountry ? ` from ${context.originCountry}` : ''}${context?.destCountry ? ` to ${context.destCountry}` : ''}. It ensures your shipment meets all regulatory requirements for customs clearance.`,
    whyItMatters: 'Missing or incomplete documents and data can result in CBP holds, penalties, storage charges, and delays in cargo release. Every requirement in this checklist exists because CBP or a Partner Government Agency requires it for lawful entry.',
    whatToDo: [
      'Review the specific requirement and determine what document or data is needed.',
      'Contact your supplier, broker, or forwarder to obtain the missing item.',
      'Upload the document or enter the required data.',
      'The AI will automatically verify the document and update your compliance score.',
    ],
    quickActions: [
      { label: 'Upload document', type: 'upload', docId: alertId },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Mark as not applicable', type: 'mark_na' },
      { label: 'Add note', type: 'note' },
    ],
  };
}

// Score-related drawer for filing readiness pills
export function getScorePillDrawer(pillType: 'verified' | 'issues' | 'missing' | 'critical_discrepancy', count: number): AlertDrawerData {
  switch (pillType) {
    case 'verified':
      return {
        id: 'score_verified',
        title: `${count} Documents Verified`,
        severity: 'success',
        whatIsThis: `${count} documents have been uploaded and verified by AI with no critical discrepancies detected. These documents are ready for filing.`,
        whyItMatters: 'Verified documents mean the AI has extracted all key data points, cross-referenced them against other documents in your packet, and confirmed consistency. This significantly reduces the risk of CBP holds or CF-28 requests.',
        whatToDo: [
          'No action needed for verified documents.',
          'Continue uploading remaining required documents to increase your filing readiness score.',
          'If you update any document, re-upload it and the AI will re-verify.',
        ],
        quickActions: [],
      };
    case 'issues':
      return {
        id: 'score_issues',
        title: `${count} Issues Flagged`,
        severity: 'high',
        whatIsThis: `The AI detected ${count} issues across your uploaded documents. These are discrepancies, data quality problems, or compliance concerns that need your attention before filing.`,
        whyItMatters: 'Unresolved issues increase the probability of a CBP hold or examination. Each issue represents a specific data point that could trigger scrutiny. Resolving all issues before filing is the best way to ensure smooth clearance.',
        whatToDo: [
          'Review each flagged document in the checklist below.',
          'Click on any document with an amber indicator to see the specific issue.',
          'Correct the source document or provide clarification.',
          'Re-upload corrected documents — the AI will re-verify automatically.',
        ],
        quickActions: [],
      };
    case 'missing':
      return {
        id: 'score_missing',
        title: `${count} Documents Missing`,
        severity: 'critical',
        whatIsThis: `${count} required documents have not been uploaded yet. These are necessary for a complete customs entry filing.`,
        whyItMatters: 'Missing documents prevent filing and will cause your shipment to be held at the port. Every missing document represents a potential delay of 1–7 days. The filing readiness score cannot reach 100% until all required documents are present.',
        whatToDo: [
          'Review the list of missing documents in the checklist below.',
          'Click on any document with a red indicator to learn what it is and how to obtain it.',
          'Request documents from suppliers, carriers, or brokers as needed.',
          'Upload each document as soon as it\'s available — the AI processes it immediately.',
        ],
        quickActions: [],
      };
    case 'critical_discrepancy':
      return {
        id: 'score_critical',
        title: `${count} Critical Discrepancies`,
        severity: 'critical',
        whatIsThis: `The AI cross-reference engine found ${count} critical discrepancies between your documents. These are data inconsistencies that will almost certainly cause a CBP hold or penalty.`,
        whyItMatters: 'Critical discrepancies cap your filing readiness score at 85% maximum. CBP uses automated systems to flag inconsistencies between ISF, B/L, invoice, and packing list data. A critical mismatch will trigger examination or hold.',
        whatToDo: [
          'Review each critical discrepancy listed in the document cards below.',
          'Determine which document contains the correct information.',
          'Obtain corrected documents from the issuing party.',
          'Re-upload corrected documents to clear the discrepancy.',
        ],
        quickActions: [],
      };
  }
}

// ─── Deadline drawer generation ───

export function getDeadlineDrawer(deadline: ShipmentDeadline): AlertDrawerData {
  const formattedDue = deadline.dueDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = deadline.dueDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  const DEADLINE_DRAWERS: Record<string, Omit<AlertDrawerData, 'id' | 'severity'>> = {
    isf_filing: {
      title: `ISF 10+2 Filing — Due ${formattedDue}`,
      whatIsThis: `The Importer Security Filing (ISF) must be filed electronically with CBP at least 24 hours before the vessel departs the foreign port. Your vessel ETD is ${deadline.sourceDate?.toLocaleDateString() || 'pending'}, making the ISF deadline ${formattedDue} at ${formattedTime}.`,
      whyItMatters: `Late filing results in an automatic $5,000 per-violation penalty. CBP can also issue a hold on your cargo at the destination port. The ISF is one of the most commonly penalized requirements — CBP issued over $100 million in ISF penalties in recent years. ${deadline.status === 'overdue' ? 'THIS DEADLINE HAS PASSED. File immediately to minimize penalty exposure.' : ''}`,
      whatToDo: [
        'Gather the 10 required data elements: seller, buyer, importer of record, consignee, manufacturer, ship-to party, country of origin, HTS 6-digit codes, container stuffing location, consolidator.',
        'File through ABI/ACE or instruct your broker to file immediately.',
        'Verify ISF bond coverage is active with your surety company.',
        'Save the ISF confirmation number and timestamp to this shipment.',
      ],
      quickActions: [
        { label: 'Upload ISF confirmation', type: 'upload', docId: 'isf_filing' },
        { label: 'Request from broker', type: 'request' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    entry_summary_7501: {
      title: `Entry Summary (7501) — Due ${formattedDue}`,
      whatIsThis: `The CBP Form 7501 Entry Summary must be filed within 10 business days of cargo release (Form 3461 filing). Based on your ${deadline.sourceLabel || 'entry date'} of ${deadline.sourceDate?.toLocaleDateString() || 'pending'}, the deadline is ${formattedDue}.`,
      whyItMatters: `Failure to file the 7501 within the 10 business day window results in liquidated damages assessed against your customs bond. The bond amount is typically $50,000 — CBP can claim the full amount. ${deadline.status === 'overdue' ? 'THIS DEADLINE HAS PASSED. Contact your broker immediately about mitigation options.' : ''}`,
      whatToDo: [
        'Ensure all supporting documents are verified: commercial invoice, packing list, and classification worksheet.',
        'Calculate duties using correct HTS rates, including any AD/CVD or Section 301 additional duties.',
        'File through ABI/ACE with duty payment via ACH.',
        'Upload the filed 7501 confirmation to this shipment.',
      ],
      quickActions: [
        { label: 'Upload 7501', type: 'upload', docId: 'entry_summary_7501' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    cf28_response: {
      title: `CF-28 Response — Due ${formattedDue}`,
      whatIsThis: `CBP issued a Request for Information (CF-28) on ${deadline.sourceDate?.toLocaleDateString() || 'a recent date'}. You have 30 calendar days from receipt to provide the requested information. Your deadline is ${formattedDue}.`,
      whyItMatters: `If you do not respond within 30 days, CBP will liquidate the entry based on the information they have — which typically means the highest applicable duty rate, potentially resulting in thousands of dollars in additional duties. ${deadline.status === 'overdue' ? 'THIS DEADLINE HAS PASSED. Contact CBP immediately to request an extension.' : ''}`,
      whatToDo: [
        'Review the CF-28 carefully — it specifies exactly what information CBP is requesting.',
        'Gather the requested documents, lab reports, product specifications, or other evidence.',
        'Prepare a formal response letter referencing the CF-28 number, entry number, and each item requested.',
        'Submit the response through your broker via ABI or directly to the requesting CBP officer.',
      ],
      quickActions: [
        { label: 'Upload CF-28 response', type: 'upload' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    protest_deadline: {
      title: `Protest Filing Deadline — Due ${formattedDue}`,
      whatIsThis: `Your entry was liquidated on ${deadline.sourceDate?.toLocaleDateString() || 'a recent date'}. You have 180 calendar days from liquidation to file a protest (CBP Form 19) if you disagree with CBP's classification, valuation, or rate of duty determination.`,
      whyItMatters: `After 180 days, the liquidation becomes final and cannot be challenged. If CBP assessed duties incorrectly, you permanently lose the right to recover overpaid duties. There is no extension available for this deadline. ${deadline.status === 'overdue' ? 'THIS DEADLINE HAS PASSED. You have permanently lost the right to protest this liquidation.' : ''}`,
      whatToDo: [
        'Review the liquidation notice and determine if the classification, value, or duty rate is incorrect.',
        'If filing a protest, prepare CBP Form 19 with specific legal grounds for your disagreement.',
        'Include all supporting documentation: rulings, lab reports, or precedent decisions.',
        'File through ABI or submit directly to the port of entry.',
      ],
      quickActions: [
        { label: 'Add note', type: 'note' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    fta_expiry: {
      title: `FTA Certificate Expiring — ${formattedDue}`,
      whatIsThis: `Your Free Trade Agreement Certificate of Origin expires on ${formattedDue}. After expiry, you cannot use this certificate to claim preferential duty rates on new entries.`,
      whyItMatters: `An expired FTA certificate means full Column 1 General duty rates apply. Depending on the product, this can mean 2.5%–25% additional duties. Request a renewal from your supplier before expiry to maintain duty savings.`,
      whatToDo: [
        'Contact your supplier or exporter and request a renewed Certificate of Origin.',
        'Verify the new certificate covers the correct HTS codes and meets origin criteria.',
        'Upload the renewed certificate before filing any entries after the expiry date.',
        'For blanket certificates, request one covering the next 12-month period.',
      ],
      quickActions: [
        { label: 'Upload renewed cert', type: 'upload', docId: 'fta_certificate' },
        { label: 'Request from supplier', type: 'request' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    bond_renewal: {
      title: `Customs Bond Renewal — Expires ${formattedDue}`,
      whatIsThis: `Your continuous customs bond expires on ${formattedDue}. Without an active bond, no entries can be filed and all cargo will be held at the port.`,
      whyItMatters: `A lapsed bond halts all import operations immediately. Every shipment arriving after bond expiry will be held until a new bond is obtained — typically 1–3 business days. Demurrage and storage charges accrue during the delay.`,
      whatToDo: [
        'Contact your surety company at least 60 days before expiry to initiate renewal.',
        'Standard continuous bond amount: $50,000 (may be higher for certain commodities or importers with compliance issues).',
        'If switching surety companies, allow extra time for the new bond to be filed with CBP.',
        'Upload the renewed bond confirmation showing new effective dates.',
      ],
      quickActions: [
        { label: 'Upload bond confirmation', type: 'upload', docId: 'customs_bond' },
        { label: 'Request from surety', type: 'request' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },

    free_time: {
      title: `Free Time Expiring — ${formattedDue}`,
      whatIsThis: `Your carrier-allotted free time at the port expires on ${formattedDue} at ${formattedTime}. After this point, demurrage and/or detention charges begin accruing.`,
      whyItMatters: `Demurrage rates are typically $150–$350 per container per day and increase on a tiered schedule (higher rates after day 3, 5, etc.). On a 2-container shipment, a 5-day delay can cost $2,000–$3,500 in demurrage alone, on top of any storage charges from the terminal operator.`,
      whatToDo: [
        'Prioritize customs clearance and delivery order pickup.',
        'If clearance is delayed, contact the carrier to request a free time extension (some carriers grant extensions for documented customs delays).',
        'Arrange trucking or drayage pickup immediately once released.',
        'Consider filing for free time dispute if demurrage is charged due to carrier/terminal delays (per FMC rules).',
      ],
      quickActions: [
        { label: 'Add note', type: 'note' },
      ],
      regulation: deadline.regulation,
      financialImpact: deadline.penalty,
    },
  };

  const template = DEADLINE_DRAWERS[deadline.type];
  if (template) {
    return {
      ...template,
      id: `deadline_${deadline.id}`,
      severity: deadline.status === 'overdue' ? 'critical' : deadline.status === 'urgent' ? 'critical' : deadline.status === 'due_soon' ? 'high' : 'medium',
    };
  }

  // Fallback
  return {
    id: `deadline_${deadline.id}`,
    title: `${deadline.label} — Due ${formattedDue}`,
    severity: deadline.status === 'overdue' ? 'critical' : 'high',
    whatIsThis: `This is a federal compliance deadline for your shipment. The deadline is ${formattedDue}.`,
    whyItMatters: deadline.consequence,
    whatToDo: [
      'Review the specific requirement and take action before the deadline.',
      'Contact your broker or compliance team if you need assistance.',
    ],
    quickActions: [{ label: 'Add note', type: 'note' }],
    regulation: deadline.regulation,
    financialImpact: deadline.penalty,
  };
}

// ─── Land Freight — Mexico Alert Drawers ───

const LAND_MEXICO_DRAWERS: Record<string, AlertDrawerData> = {
  carta_porte: {
    id: 'carta_porte',
    title: 'Carta Porte / CFDI UUID Missing',
    severity: 'critical',
    whatIsThis: 'The Carta Porte is a mandatory Mexican digital tax document (CFDI with Complemento Carta Porte, version 3.1) that must accompany all freight moving through Mexican territory. It is issued by the Mexican carrier and contains a UUID — a unique fiscal identification number. For foreign trade operations crossing the U.S.-Mexico border, this UUID is required to generate the DODA document and complete Mexican customs clearance. Enforcement became mandatory January 1, 2024.',
    whyItMatters: 'Without the Carta Porte UUID, the Mexican broker cannot file the DODA, the truck cannot clear Mexican customs on the export side, and the shipment cannot legally depart Mexico. If caught transporting goods in Mexico without a valid Carta Porte, the carrier faces fines and the shipment can be impounded. This is entirely the Mexican carrier\'s responsibility to issue — but the U.S. broker must collect the UUID number before the truck departs.',
    whatToDo: [
      'Contact the Mexican carrier or the Mexican customs broker and request the Carta Porte UUID for this shipment.',
      'Provide the carrier with the correct cargo description, weight, origin and destination addresses, and route details so they can generate the document accurately.',
      'Confirm the Carta Porte version is 3.1 (mandatory since July 2024).',
      'Store the UUID in this shipment record — it must be referenced in the U.S. entry documentation for northbound clearance.',
    ],
    quickActions: [
      { label: 'Upload Carta Porte', type: 'upload', docId: 'carta_porte' },
      { label: 'Request from Mexican carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'SAT Mexico — Complemento Carta Porte v3.1',
    financialImpact: 'Shipment impounded + SAT fine',
  },
  pedimento: {
    id: 'pedimento',
    title: 'Pedimento Number Missing',
    severity: 'critical',
    whatIsThis: 'The Pedimento de Importación is Mexico\'s official customs declaration document, filed electronically by the Mexican customs broker (agente aduanal) through Mexico\'s customs system (VUCEM). It is required for every commercial crossing into or out of Mexico. It contains a unique alphanumeric number that identifies the Mexican customs entry.',
    whyItMatters: 'CBP uses the Pedimento number to verify the shipment was legally cleared on the Mexican side. For northbound shipments, the Mexican broker must complete the Pedimento for the export from Mexico before the truck can depart. Without this number confirmed, the U.S. entry is incomplete and the truck may be turned away or held at the port of entry.',
    whatToDo: [
      'Confirm a licensed Mexican customs broker (agente aduanal) has been appointed for this shipment.',
      'Provide the Mexican broker with the commercial invoice in Spanish, packing list, and USMCA certificate if applicable.',
      'Request the Pedimento number once filed — it is issued electronically through VUCEM.',
      'Verify the Pedimento number matches the cargo description in your commercial documents before the truck departs.',
    ],
    quickActions: [
      { label: 'Upload Pedimento', type: 'upload', docId: 'pedimento' },
      { label: 'Request from Mexican broker', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'Mexican Customs Law (Ley Aduanera)',
    financialImpact: 'Truck held at border until Pedimento filed',
  },
  mexican_broker_appointment: {
    id: 'mexican_broker_appointment',
    title: 'Mexican Customs Broker Not Appointed',
    severity: 'critical',
    whatIsThis: 'Every commercial shipment crossing the U.S.-Mexico border requires a licensed customs broker on BOTH sides. The U.S. customs broker handles the U.S. side. A separate Mexican customs broker (agente aduanal), licensed by the Mexican government, is required to handle the Mexican side — filing the Pedimento and clearing the goods through Mexican customs.',
    whyItMatters: 'Without a Mexican customs broker appointed, the shipment will stop at the border. The truck has no one to file the Mexican Pedimento or clear the goods on the Mexican side. This is one of the most common causes of unexpected delays for shippers new to U.S.-Mexico freight. Neither the U.S. broker nor the carrier can perform this function.',
    whatToDo: [
      'Ask your Mexican supplier or the consignee to confirm which Mexican customs broker they use and at which port of entry they operate.',
      'Note that most Mexican customs brokers only operate at specific border crossings — routing freight to the wrong port creates delays.',
      'Share the Mexican broker\'s name and contact with the U.S. broker so both sides can coordinate document exchange before the truck departs.',
    ],
    quickActions: [
      { label: 'Upload broker confirmation', type: 'upload', docId: 'mexican_broker_appointment' },
      { label: 'Request broker details from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Indefinite border delay',
  },
  paps_document: {
    id: 'paps_document',
    title: 'PAPS Document Missing',
    severity: 'critical',
    whatIsThis: 'PAPS stands for Pre-Arrival Processing System. It is the land border equivalent of the ocean ISF filing. The carrier places a PAPS barcode sticker on the commercial documents at pickup. This sticker contains a unique cargo control number (CCN) made up of the carrier code plus a shipment number. The U.S. customs broker uses this number to pre-file the entry with CBP before the truck arrives at the border.',
    whyItMatters: 'CBP matches the physical truck to the broker\'s entry filing using the PAPS barcode. If the PAPS number is not in the system or does not match the broker\'s filing when the truck arrives, the truck will be turned away from the port of entry and must circle back. This causes significant delay and additional carrier costs.',
    whatToDo: [
      'Confirm with the carrier that a PAPS sticker has been affixed to the commercial documents at time of pickup.',
      'Obtain the PAPS number (cargo control number) from the carrier and provide it to the customs broker immediately.',
      'The broker uses this number to pre-file the entry in ACE.',
      'Verify with the broker that the entry has been set up and accepted before the truck departs toward the border.',
    ],
    quickActions: [
      { label: 'Upload PAPS document', type: 'upload', docId: 'paps_document' },
      { label: 'Request from carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'CBP Pre-Arrival Processing System',
    financialImpact: 'Truck turned away — $500–$2,000 in delay costs',
  },
  doda: {
    id: 'doda',
    title: 'DODA Document Missing',
    severity: 'high',
    whatIsThis: 'The DODA (Documento de Operación para Despacho Aduanero) is a Mexican customs clearance operation document that links the Carta Porte UUID to the Mexican customs entry (Pedimento). It is required for all foreign trade operations crossing the U.S.-Mexico border.',
    whyItMatters: 'Without the DODA, the transport and customs declarations are not connected, and the truck cannot legally cross the border for international trade purposes.',
    whatToDo: [
      'Ensure the Carta Porte UUID has been obtained from the Mexican carrier.',
      'The Mexican customs broker generates the DODA through the Mexican customs system.',
      'Verify the DODA references both the correct Carta Porte UUID and Pedimento number.',
    ],
    quickActions: [
      { label: 'Upload DODA', type: 'upload', docId: 'doda' },
      { label: 'Request from Mexican broker', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Truck stopped at Mexican customs checkpoint',
  },
  inward_cargo_manifest: {
    id: 'inward_cargo_manifest',
    title: 'Inward Cargo Manifest Missing',
    severity: 'high',
    whatIsThis: 'Document prepared by the U.S. customs broker, filed under the Border Cargo Selectivity (BCS) system. The driver presents this at the port of entry. It contains the entry number that CBP uses to match the truck to the filed entry.',
    whyItMatters: 'Without this document, the driver cannot proceed through primary inspection at the port of entry. CBP cannot match the physical truck to the electronic entry filing.',
    whatToDo: [
      'Confirm the customs broker has prepared the inward cargo manifest.',
      'Ensure the manifest contains the correct entry number and PAPS/cargo control number.',
      'Provide the manifest to the driver before the truck departs toward the border.',
    ],
    quickActions: [
      { label: 'Upload manifest', type: 'upload', docId: 'inward_cargo_manifest' },
      { label: 'Request from broker', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Truck held at border until corrected documents arrive',
  },
  carta_instrucciones: {
    id: 'carta_instrucciones',
    title: 'Letter of Instructions Missing',
    severity: 'medium',
    whatIsThis: 'Contact sheet containing names and phone numbers for all parties involved in the Mexico border crossing: shipper, consignee, U.S. broker, Mexican broker, carrier, and driver.',
    whyItMatters: 'If any issue arises at the border, the driver needs to reach the correct person instantly. Without this, problems that could be resolved in minutes turn into hours-long delays.',
    whatToDo: [
      'Compile contact information for all parties: shipper, consignee, U.S. broker, Mexican broker, carrier dispatcher, and driver.',
      'Provide the letter to the driver before departure.',
    ],
    quickActions: [
      { label: 'Upload letter', type: 'upload', docId: 'carta_instrucciones' },
      { label: 'Add note', type: 'note' },
    ],
  },
  nom_compliance: {
    id: 'nom_compliance',
    title: 'NOM Compliance Documentation Missing',
    severity: 'high',
    whatIsThis: 'Normas Oficiales Mexicanas (NOM) are Mexican product safety standards. Required for regulated product categories including electronics, food, textiles, toys, and chemicals entering Mexico.',
    whyItMatters: 'Mexican customs will not release goods that require NOM compliance without proper documentation. Products may be refused entry and returned at exporter\'s expense.',
    whatToDo: [
      'Verify NOM requirements for your specific product category with the Mexican customs broker.',
      'Obtain NOM compliance certification or test reports from an accredited Mexican testing laboratory.',
      'Ensure the NOM mark appears on the product and/or packaging as required.',
      'Note: U.S. UL/FCC certifications do NOT substitute for NOM compliance.',
    ],
    quickActions: [
      { label: 'Upload NOM certificate', type: 'upload', docId: 'nom_compliance' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Goods refused by Mexican customs. Storage + re-export costs.',
  },
};

// ─── Land Freight — Canada Alert Drawers ───

const LAND_CANADA_DRAWERS: Record<string, AlertDrawerData> = {
  aci_emanifest: {
    id: 'aci_emanifest',
    title: 'ACI eManifest Not Filed / Missing',
    severity: 'critical',
    whatIsThis: 'ACI (Advance Commercial Information) eManifest is a mandatory electronic pre-arrival filing required by the Canada Border Services Agency (CBSA) for all commercial truck crossings into Canada. The carrier — not the customs broker — is responsible for filing this through the CBSA eManifest Portal at least 1 hour before the truck arrives at the Canadian border. It contains conveyance and cargo data that CBSA uses for risk assessment before the truck arrives.',
    whyItMatters: 'The ACI eManifest and the PARS release filing are two completely separate requirements. Missing or late eManifest filing results in an AMPS (Administrative Monetary Penalty System) penalty of up to $8,000 CAD for non-filing or $750 CAD for late filing. The truck may also be refused entry at the border crossing.',
    whatToDo: [
      'Confirm with the carrier that they are ACI eManifest compliant and have a valid CBSA Carrier Code.',
      'Provide all shipment details to the carrier as early as possible — carrier must file before loading.',
      'The Canadian customs broker monitors PARS separately; confirm both the eManifest and the PARS release are filed and accepted at least 1 hour before border arrival.',
      'The driver must present the ACI Lead Sheet (barcoded paper document) to the CBSA officer at the border.',
    ],
    quickActions: [
      { label: 'Upload eManifest confirmation', type: 'upload', docId: 'aci_emanifest' },
      { label: 'Request from carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'CBSA Advance Commercial Information (ACI) requirements',
    financialImpact: 'Up to $8,000 CAD penalty for non-filing',
  },
  carm_registration: {
    id: 'carm_registration',
    title: 'CARM Registration — Canadian Importer Not Confirmed',
    severity: 'critical',
    whatIsThis: 'CARM (CBSA Assessment and Revenue Management) is Canada\'s new customs processing system that became the official system of record on October 21, 2024. All Canadian importers must be registered in the CARM Client Portal with a Business Number (BN) and must have posted their own financial security (surety bond or cash deposit) to receive goods before paying duties under the Release Prior to Payment (RPP) program. As of May 20, 2025, customs brokers can no longer post their own security on behalf of importers.',
    whyItMatters: 'If the Canadian importer is not registered in CARM and has not posted financial security, their goods will not be released before duties are paid. This means the truck sits at the border until payment is made. For high-value commercial shipments, this is a significant cash flow and delay issue. The old B3 entry form no longer exists — everything goes through CARM.',
    whatToDo: [
      'Verify with the Canadian importer that they are registered in the CARM Client Portal at ccp-pcc.cbsa-asfc.gc.ca.',
      'Confirm they have enrolled in the RPP sub-program and posted financial security.',
      'Confirm they have delegated authority to the Canadian customs broker in the portal.',
      'For non-resident importers (NRIs) — U.S. companies acting as the importer of record in Canada — the NRI must also register directly in CARM; the broker cannot do this on their behalf.',
    ],
    quickActions: [
      { label: 'Upload CARM confirmation', type: 'upload', docId: 'carm_registration' },
      { label: 'Request from Canadian importer', type: 'request' },
      { label: 'Add note', type: 'note' },
      { label: 'CARM Client Portal', type: 'link', href: 'https://ccp-pcc.cbsa-asfc.gc.ca' },
    ],
    regulation: 'CBSA Assessment and Revenue Management (CARM)',
    financialImpact: 'Goods held at border until duties paid in full',
  },
  pars_document: {
    id: 'pars_document',
    title: 'PARS Document Missing (Canada)',
    severity: 'critical',
    whatIsThis: 'PARS (Pre-Arrival Review System) is Canada\'s pre-clearance system for commercial truck freight. It is the Canadian equivalent of the U.S. PAPS system. The carrier affixes a PARS barcode sticker to the shipping documents at pickup. The sticker contains a Cargo Control Number (CCN) made up of the carrier\'s CBSA Carrier Code plus a unique shipment number. The Canadian customs broker uses this number to submit the release request to CBSA before the truck arrives.',
    whyItMatters: 'PARS and the ACI eManifest must BOTH be on file with CBSA at least 1 hour before the driver arrives at the Canadian border. If PARS is not set up, CBSA has no release request to match to the truck and the driver will be turned away. Unlike the U.S. system, PARS and ACI eManifest are completely separate — filing one does not fulfill the other.',
    whatToDo: [
      'Confirm the carrier has affixed a PARS sticker to the commercial documents at time of pickup.',
      'Obtain the PARS number (CCN) from the carrier and pass it to the Canadian customs broker immediately.',
      'The broker submits the PARS release request through CBSA\'s electronic system.',
      'Verify with the broker that PARS is accepted before the truck departs toward the border. You can often verify PARS status through the broker\'s online tracking tool.',
    ],
    quickActions: [
      { label: 'Upload PARS document', type: 'upload', docId: 'pars_document' },
      { label: 'Request from carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'CBSA Pre-Arrival Review System',
    financialImpact: 'Truck turned away at Canadian border',
  },
  aci_lead_sheet: {
    id: 'aci_lead_sheet',
    title: 'ACI Lead Sheet Missing',
    severity: 'high',
    whatIsThis: 'Paper document the driver presents to the CBSA officer at the Canadian border. Contains the barcoded Cargo Control Number and confirms the ACI eManifest is on file.',
    whyItMatters: 'CBSA officers scan this barcode to pull up the electronic eManifest. Without it, the truck cannot be processed at the border.',
    whatToDo: [
      'Confirm the carrier has generated the ACI Lead Sheet from the eManifest system.',
      'Ensure the driver has the physical lead sheet before departing for the border.',
      'Verify the CCN on the lead sheet matches the eManifest filing.',
    ],
    quickActions: [
      { label: 'Upload lead sheet', type: 'upload', docId: 'aci_lead_sheet' },
      { label: 'Request from carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Truck held at border until lead sheet produced',
  },
  cad_filing: {
    id: 'cad_filing',
    title: 'Commercial Accounting Declaration (CAD) Not Filed',
    severity: 'high',
    whatIsThis: 'The CAD replaces the old B3 and B2 forms as of October 21, 2024. Filed by the Canadian customs broker through the CARM Client Portal within 5 business days of release. This is how Canadian duties and taxes are assessed and paid.',
    whyItMatters: 'Late filing results in AMPS penalties. The CAD is the legal filing that determines what the Canadian importer owes in duties, GST/HST, and other fees.',
    whatToDo: [
      'Confirm the Canadian customs broker has filed or will file the CAD within 5 business days of release.',
      'Provide all required data: HS codes, value for duty, country of origin, USMCA claim if applicable.',
      'Ensure the Canadian importer\'s Business Number is correct in the filing.',
    ],
    quickActions: [
      { label: 'Upload CAD confirmation', type: 'upload', docId: 'cad_filing' },
      { label: 'Request from Canadian broker', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    regulation: 'CBSA CARM',
    financialImpact: 'AMPS penalties for late filing',
  },
  canada_customs_invoice: {
    id: 'canada_customs_invoice',
    title: 'Canada Customs Invoice (CCI) Missing',
    severity: 'high',
    whatIsThis: 'A Canadian-format invoice required by CBSA. Different from the standard U.S. commercial invoice — it includes specific fields required by Canadian customs regulations such as place of direct shipment, conditions of sale, and currency of settlement in a prescribed format.',
    whyItMatters: 'Without the CCI, CBSA may delay processing or assess duties at the highest applicable rate. The standard U.S. commercial invoice may not contain all required Canadian fields.',
    whatToDo: [
      'Prepare a Canada Customs Invoice in the prescribed CBSA format.',
      'Include all required Canadian-specific fields: place of direct shipment, conditions of sale, currency of settlement.',
      'Provide to the Canadian customs broker for entry filing.',
    ],
    quickActions: [
      { label: 'Upload CCI', type: 'upload', docId: 'canada_customs_invoice' },
      { label: 'Request from exporter', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Duties assessed at highest applicable rate',
  },
};

// ─── Land Freight — Shared Info Drawers ───

const LAND_INFO_DRAWERS: Record<string, AlertDrawerData> = {
  no_isf_land: {
    id: 'no_isf_land',
    title: 'ISF Not Required for Land Freight',
    severity: 'info',
    whatIsThis: 'The Importer Security Filing (ISF 10+2) is required ONLY for ocean freight entering the United States. Land freight uses the PAPS (Pre-Arrival Processing System) instead. PAPS serves a similar purpose — pre-notifying CBP of incoming cargo — but is a completely different system.',
    whyItMatters: 'You do not need to file an ISF for this land freight shipment. The PAPS barcode and pre-filed entry serve the pre-arrival notification function for land border crossings.',
    whatToDo: [
      'Ensure the PAPS document is set up correctly — this replaces ISF for land freight.',
      'The carrier affixes the PAPS barcode sticker and the broker pre-files the entry.',
    ],
    quickActions: [{ label: 'Add note', type: 'note' }],
  },
  no_hmf_land: {
    id: 'no_hmf_land',
    title: 'Harbor Maintenance Fee Not Applicable',
    severity: 'info',
    whatIsThis: 'The Harbor Maintenance Fee (HMF) of 0.125% applies ONLY to ocean freight arriving at U.S. seaports. Land freight crossing at border checkpoints is exempt from HMF.',
    whyItMatters: 'This fee has been automatically suppressed for this land freight shipment. No action required.',
    whatToDo: [],
    quickActions: [],
  },
  usmca_land_prompt: {
    id: 'usmca_land_prompt',
    title: 'USMCA Eligibility — Check Recommended',
    severity: 'medium',
    whatIsThis: 'For all Mexico and Canada land freight, USMCA (United States–Mexico–Canada Agreement) is commonly used to eliminate or reduce duties. USMCA is far more prevalent in land freight than ocean freight because the trading partners are the USMCA member countries.',
    whyItMatters: 'If your goods qualify under USMCA, duties may be reduced to 0%. For Canada-origin goods, USMCA qualification also exempts the shipment from Merchandise Processing Fee (MPF). This can represent significant savings.',
    whatToDo: [
      'Ask your supplier whether the goods meet USMCA rules of origin.',
      'Obtain a USMCA Certificate of Origin with all 9 required data elements.',
      'Upload the certificate to this shipment to claim preferential treatment.',
    ],
    quickActions: [
      { label: 'Upload USMCA certificate', type: 'upload', docId: 'usmca_certificate' },
      { label: 'Request from supplier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Potential 100% duty savings + MPF exemption (Canada)',
  },
  cargo_insurance_mexico: {
    id: 'cargo_insurance_mexico',
    title: 'Cargo Insurance — Mexico Territory Coverage',
    severity: 'medium',
    whatIsThis: 'Mexican carriers are not legally required to carry cargo insurance. For goods moving inside Mexico, your existing cargo insurance policy may not cover the Mexico territory leg of the journey.',
    whyItMatters: 'If goods are lost or damaged while in transit through Mexico and your insurance policy doesn\'t extend to Mexico territory, you have no coverage. This is a common gap in shipper insurance policies.',
    whatToDo: [
      'Check your cargo insurance policy to verify whether it covers Mexico territory.',
      'If not covered, request a Mexico territory endorsement from your insurer.',
      'Alternatively, verify whether the Mexican carrier provides any cargo liability coverage.',
    ],
    quickActions: [{ label: 'Add note', type: 'note' }],
  },
  immex_program: {
    id: 'immex_program',
    title: 'IMMEX / Maquiladora Program Status',
    severity: 'info',
    whatIsThis: 'The IMMEX program (Industria Manufacturera, Maquiladora y de Servicios de Exportación) allows certified Mexican manufacturers to temporarily import materials duty-free into Mexico for manufacturing and re-export. This changes the customs value calculation on the Mexico side.',
    whyItMatters: 'If your Mexican trading partner is IMMEX-certified, they may be exempt from Mexican IVA (16% VAT) on temporary imports. This affects the landed cost calculation and should be noted in the shipment profile.',
    whatToDo: [
      'Ask your Mexican supplier or importer whether they are IMMEX-certified.',
      'If yes, note this in the shipment profile — it affects duty and tax calculations on the Mexico side.',
    ],
    quickActions: [{ label: 'Add note', type: 'note' }],
  },
};

// Register all land freight drawers
Object.assign(DRAWER_TEMPLATES, LAND_MEXICO_DRAWERS, LAND_CANADA_DRAWERS, LAND_INFO_DRAWERS);

// Also register land-specific document type drawers
const LAND_DOC_DRAWERS: Record<string, AlertDrawerData> = {
  truck_bol: {
    id: 'truck_bol',
    title: 'Bill of Lading / Truck BOL',
    severity: 'high',
    whatIsThis: 'Transport contract and receipt for goods issued by the truck carrier. For land freight, this is typically a straight bill of lading or standard truck BOL identifying the cargo, shipper, consignee, and routing.',
    whyItMatters: 'CBP uses the BOL to verify cargo contents against the filed entry. The driver presents this at the port of entry along with the PAPS/PARS barcode. Mismatches trigger inspection.',
    whatToDo: [
      'Obtain the truck BOL from the carrier at time of pickup.',
      'Verify the description, weight, and piece count match the commercial invoice and packing list.',
      'Ensure the PAPS or PARS barcode number is noted on the BOL.',
      'Provide to the customs broker for entry filing.',
    ],
    quickActions: [
      { label: 'Upload BOL', type: 'upload', docId: 'truck_bol' },
      { label: 'Request from carrier', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Entry rejected. Truck turned away until corrected.',
  },
  commercial_invoice_mx: {
    id: 'commercial_invoice_mx',
    title: 'Commercial Invoice (Spanish version required)',
    severity: 'high',
    whatIsThis: 'The primary transaction document for assessing duties. For Mexico crossings, a Spanish-language version must also be available for the Mexican customs broker to file the Pedimento.',
    whyItMatters: 'The Mexican customs broker cannot file the Pedimento without a Spanish-language invoice. CBP also requires the invoice for U.S. entry filing.',
    whatToDo: [
      'Ensure both English and Spanish versions of the commercial invoice are available.',
      'The Spanish version must contain all the same data: seller, buyer, descriptions, values, origin, Incoterms.',
      'Provide the Spanish version to the Mexican customs broker.',
    ],
    quickActions: [
      { label: 'Upload invoice', type: 'upload', docId: 'commercial_invoice_mx' },
      { label: 'Request Spanish version', type: 'request' },
      { label: 'Add note', type: 'note' },
    ],
    financialImpact: 'Mexican Pedimento cannot be filed without Spanish invoice.',
  },
};

Object.assign(DRAWER_TEMPLATES, LAND_DOC_DRAWERS);
