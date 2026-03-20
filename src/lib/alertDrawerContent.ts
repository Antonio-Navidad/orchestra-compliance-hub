// Universal alert drawer content registry
// Every alert, badge, pill, and flag resolves to a specific drawer

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
