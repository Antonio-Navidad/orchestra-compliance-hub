/**
 * Land Freight Document Profiles — Mexico & Canada
 * Four scenarios: Mexico Import, Mexico Export, Canada Import, Canada Export
 */

import type { DocRequirement, ModeDocProfile, FilingDeadline, KeyRisk } from './shipmentModes';

// ══════════════════════════════════════════
// SHARED LAND DOCS (reused across scenarios)
// ══════════════════════════════════════════

const LAND_COMMERCIAL_INVOICE: DocRequirement = {
  id: 'commercial_invoice',
  name: 'Commercial Invoice',
  status: 'required',
  source: 'Exporter / supplier',
  whatItIs: 'The primary document establishing the transaction value between buyer and seller. CBP uses it to assess duties and verify the declared value of imported goods.',
  whyRequired: 'CBP requires a commercial invoice for every formal import entry (19 CFR 141.86). Without it, your entry cannot be filed and goods will be held.',
  mustContain: ['Seller and buyer names and addresses', 'Detailed description of merchandise', 'Quantity with unit of measure', 'Unit price and total value', 'Currency', 'Country of origin', 'Terms of sale (Incoterm)'],
  commonMistakes: ['Vague descriptions like "assorted merchandise"', 'Missing Incoterm', 'Value stated in wrong currency without conversion rate'],
  penalty: 'Entry cannot be filed. Goods held at port accruing storage charges.',
};

const LAND_PACKING_LIST: DocRequirement = {
  id: 'packing_list',
  name: 'Packing List',
  status: 'required',
  source: 'Foreign supplier / exporter',
  whatItIs: 'Itemized list showing how goods are packed — quantities per carton, weights, dimensions.',
  whyRequired: 'CBP compares it against the commercial invoice and bill of lading to detect discrepancies.',
  mustContain: ['Carton/case marks and numbers', 'Contents of each carton with quantities', 'Net and gross weights per carton', 'Total number of packages'],
  commonMistakes: ['Totals don\'t match invoice totals', 'Missing carton marks', 'Net/gross weight confusion'],
  penalty: 'Discrepancies trigger examination ($4,000–$8,000 exam fee).',
};

const LAND_TRUCK_BOL: DocRequirement = {
  id: 'truck_bol',
  name: 'Bill of Lading / Truck BOL',
  status: 'required',
  source: 'Trucking carrier at pickup',
  whatItIs: 'Transport contract and receipt for goods issued by the truck carrier. For land freight, this is typically a straight bill of lading or a standard truck BOL. It identifies the cargo, shipper, consignee, and routing.',
  whyRequired: 'CBP uses the BOL to verify cargo contents against the filed entry. The driver presents this at the port of entry along with the PAPS/PARS barcode.',
  mustContain: ['Shipper and consignee names', 'Origin and destination', 'Cargo description and piece count', 'Weight', 'Carrier name and trailer number', 'PAPS or PARS barcode number'],
  commonMistakes: ['BOL description doesn\'t match invoice — triggers inspection', 'Missing trailer number', 'Weight discrepancy between BOL and packing list'],
  penalty: 'Entry rejected. Truck turned away from port of entry until corrected.',
};

const LAND_CUSTOMS_BOND: DocRequirement = {
  id: 'customs_bond',
  name: 'Customs Bond (CBP Form 301)',
  status: 'required',
  source: 'Surety company, arranged by customs broker',
  whatItIs: 'Financial guarantee ensuring the importer will pay all duties, taxes, and penalties.',
  whyRequired: 'Required for ALL formal entries (goods valued over $2,500). CBP will not release goods without an active bond.',
  mustContain: ['Importer of record name and number', 'Bond type', 'Bond amount', 'Surety company', 'Effective dates'],
  commonMistakes: ['Expired bond', 'Insufficient bond amount', 'Wrong importer number on bond'],
  penalty: 'No bond = no entry. Truck held at border crossing.',
};

const LAND_ENTRY_3461: DocRequirement = {
  id: 'entry_3461',
  name: 'CBP Form 3461 — Entry/Immediate Delivery',
  status: 'required',
  source: 'Customs broker files electronically',
  whatItIs: 'The initial entry filing that requests release of goods from CBP custody. For land freight, this is pre-filed using the PAPS number.',
  whyRequired: 'CBP cannot release the truck without a filed entry. The 3461 is matched to the PAPS barcode when the truck arrives.',
  mustContain: ['Entry number', 'Importer of record', 'PAPS/cargo control number', 'HTS classification', 'Port of entry'],
  commonMistakes: ['PAPS number mismatch — truck turned away', 'Wrong port of entry code', 'Filed too late — truck arrives before entry is in system'],
  penalty: 'Truck cannot proceed through port of entry. Wait time and additional carrier charges.',
};

const LAND_ENTRY_7501: DocRequirement = {
  id: 'entry_summary',
  name: 'Entry Summary (CBP Form 7501)',
  status: 'required',
  source: 'Customs broker prepares and files',
  whatItIs: 'The formal entry document filed with CBP containing HTS classification, declared value, duty rate, and calculated duties owed.',
  whyRequired: 'Must be filed within 10 working days of entry. This is the legal declaration that determines duties owed.',
  mustContain: ['Entry number', 'HTS codes to 10-digit level', 'Entered value', 'Duty rate and amount', 'Country of origin', 'MID'],
  commonMistakes: ['Wrong HTS code', 'Entered value doesn\'t match invoice', 'Missing or incorrect MID'],
  penalty: 'Late filing: penalty up to domestic value of goods. Incorrect classification: 20–80% penalty.',
};

const LAND_HTS_WORKSHEET: DocRequirement = {
  id: 'hts_worksheet',
  name: 'HTS Classification Worksheet',
  status: 'required',
  source: 'Customs broker prepares',
  whatItIs: 'Internal working document showing how the HTS code was determined for each commodity in the shipment.',
  whyRequired: 'Documents the classification rationale in case of CBP inquiry or post-entry audit.',
  mustContain: ['Product description', 'HTS heading analysis', 'Final 10-digit HTS code', 'Duty rate'],
  commonMistakes: ['Not documenting the classification process', 'Relying solely on supplier-provided codes'],
  penalty: 'No direct penalty, but lack of documentation weakens defense in CF-28 or audit.',
};

const LAND_ACH: DocRequirement = {
  id: 'ach_authorization',
  name: 'ACH Payment Authorization',
  status: 'required',
  source: 'Importer establishes with CBP',
  whatItIs: 'Authorization for CBP to collect duties, taxes, and fees via ACH debit from the importer\'s bank account.',
  whyRequired: 'ACH is the standard payment method for duties. Without it, the importer must arrange alternative payment which delays release.',
  mustContain: ['Bank account details', 'Importer of record number', 'ACH debit authorization'],
  commonMistakes: ['ACH not set up before first entry', 'Bank account changed without updating CBP'],
  penalty: 'Duties cannot be collected — entry delayed until payment arranged.',
};

const LAND_DELIVERY_ORDER: DocRequirement = {
  id: 'delivery_order',
  name: 'Delivery Order',
  status: 'required',
  source: 'Customs broker issues after CBP release',
  whatItIs: 'Authorization document issued after CBP releases the shipment, directing the carrier to deliver goods to the consignee.',
  whyRequired: 'Confirms CBP has released the goods and the carrier can proceed to final destination.',
  mustContain: ['Entry number', 'Release date', 'Consignee delivery address', 'Carrier instructions'],
  commonMistakes: ['Delivery order not issued promptly — truck waits at border'],
  penalty: 'No CBP penalty but carrier detention charges accrue.',
};

const LAND_COO_DECLARATION: DocRequirement = {
  id: 'coo_declaration',
  name: 'Country of Origin Declaration',
  status: 'required',
  source: 'Exporter or importer declares',
  whatItIs: 'Declaration identifying where goods were manufactured or substantially transformed.',
  whyRequired: 'Country of origin determines duty rates, FTA eligibility, AD/CVD applicability, and Section 301 tariff liability.',
  mustContain: ['Country of manufacture', 'Declaration statement', 'Signature'],
  commonMistakes: ['Declaring country of export instead of country of manufacture', 'Multi-country supply chain without proper origin determination'],
  penalty: 'Incorrect origin can result in wrong duty rate and penalties under 19 U.S.C. 1592.',
};

const LAND_USMCA: DocRequirement = {
  id: 'usmca_certificate',
  name: 'USMCA Certificate of Origin',
  status: 'conditional',
  source: 'Exporter, producer, or importer may certify',
  whatItIs: 'Certification that goods qualify for preferential (reduced or zero) duty rates under the United States–Mexico–Canada Agreement. No official form required — any format acceptable if all 9 required data elements are present.',
  whyRequired: 'Without a valid USMCA certification, CBP applies the standard MFN duty rate. For many goods, USMCA eliminates duties entirely. Canada-origin goods with USMCA also qualify for MPF exemption.',
  mustContain: ['Certifier identity (exporter, producer, or importer)', 'Exporter name and address', 'Producer name and address', 'Importer name and address', 'Description of goods', 'HS tariff classification (6-digit)', 'Origin criterion met', 'Blanket period if applicable', 'Authorized signature and date'],
  commonMistakes: ['Missing one of the 9 required data elements — certification invalid', 'HS code on USMCA doesn\'t match entry', 'Blanket certification expired', 'Using old NAFTA certificate instead of USMCA format'],
  penalty: 'Full MFN duty rate applied. On a $200,000 shipment at 5% duty, that\'s $10,000 in unnecessary duties.',
  condition: 'Required when claiming preferential duty rates under USMCA',
};

const LAND_MANUFACTURER_AFFIDAVIT: DocRequirement = {
  id: 'manufacturer_affidavit',
  name: 'Manufacturer\'s Affidavit / Supplier Declaration',
  status: 'conditional',
  source: 'Foreign manufacturer or supplier',
  whatItIs: 'Sworn statement from the manufacturer confirming production details, origin of materials, and compliance with applicable regulations.',
  whyRequired: 'Supports the country of origin claim and FTA certification. CBP may request this during post-entry audit.',
  mustContain: ['Manufacturer identity', 'Product description', 'Origin of materials', 'Production process description'],
  commonMistakes: ['Generic template without shipment-specific details', 'Not updated when supply chain changes'],
  penalty: 'Weakens FTA claim defense. CBP can deny preferential treatment and assess full duties retroactively.',
  condition: 'Required when claiming FTA benefits or when CBP requests origin verification',
};

const LAND_TRANSFER_PRICING: DocRequirement = {
  id: 'transfer_pricing',
  name: 'Transfer Pricing Documentation',
  status: 'conditional',
  source: 'Importer maintains on file',
  whatItIs: 'Documentation establishing that the declared value between related parties reflects arm\'s-length pricing.',
  whyRequired: 'CBP may challenge the transaction value if buyer and seller are related. Documentation must be available for 5 years.',
  mustContain: ['Transfer pricing study or policy', 'Intercompany pricing agreement', 'Assist identification'],
  commonMistakes: ['No documentation maintained', 'Assists not added to declared value'],
  penalty: 'CBP rejects transaction value, substitutes higher valuation, assesses additional duties + penalties.',
  condition: 'Required when buyer and seller are related parties',
};

const LAND_ADCVD: DocRequirement = {
  id: 'ad_cvd_check',
  name: 'AD/CVD Order Check',
  status: 'required',
  source: 'Auto-run by system',
  whatItIs: 'Automated check against active Antidumping and Countervailing Duty orders for the declared HS codes and country of origin.',
  whyRequired: 'AD/CVD duties can range from 0% to over 300%. Missing these deposits creates massive retroactive liability.',
  mustContain: ['HS code verification', 'Country of origin', 'AD/CVD case number if applicable'],
  commonMistakes: ['Not checking scope rulings', 'Wrong manufacturer rate'],
  penalty: 'Retroactive duty assessment up to 5 years. Criminal penalties for evasion.',
};

const LAND_RESTRICTED_PARTY: DocRequirement = {
  id: 'restricted_party_screening',
  name: 'Restricted Party Screening Record',
  status: 'required',
  source: 'Auto-run on shipment creation',
  whatItIs: 'Automated screening of all parties against U.S. government restricted/denied party lists: BIS Entity List, OFAC SDN List, State Dept Debarred, Unverified List, and Denied Persons List.',
  whyRequired: 'Federal law prohibits transactions with sanctioned parties. Screening is required for every shipment.',
  mustContain: ['Screening timestamp', 'All 5 list results', 'Match/no-match determination'],
  commonMistakes: ['Screening only the consignee, not all parties', 'Not re-screening when parties change'],
  penalty: 'Criminal penalties up to $1,000,000 and 20 years imprisonment for OFAC violations.',
};

// ══════════════════════════════════════════
// MEXICO-SPECIFIC DOCUMENTS
// ══════════════════════════════════════════

const MEXICO_COMMERCIAL_INVOICE_SPANISH: DocRequirement = {
  ...LAND_COMMERCIAL_INVOICE,
  id: 'commercial_invoice_mx',
  name: 'Commercial Invoice (Spanish version required)',
  whatItIs: 'The primary transaction document. For Mexico crossings, a Spanish-language version must also be available for the Mexican customs broker to file the Pedimento.',
  commonMistakes: [...LAND_COMMERCIAL_INVOICE.commonMistakes, 'Only English version available — Mexican broker cannot file Pedimento without Spanish invoice'],
};

const PEDIMENTO: DocRequirement = {
  id: 'pedimento',
  name: 'Pedimento de Importación',
  status: 'required',
  source: 'Mexican customs broker (agente aduanal) files through VUCEM',
  whatItIs: 'Mexico\'s official customs declaration document, filed electronically by the Mexican customs broker through Mexico\'s customs system (VUCEM). It is required for every commercial crossing into or out of Mexico and contains a unique alphanumeric number.',
  whyRequired: 'CBP uses the Pedimento number to verify the shipment was legally cleared on the Mexican side. Without this number confirmed, the U.S. entry is incomplete and the truck may be turned away.',
  mustContain: ['Pedimento number', 'Exporter and importer details', 'Cargo description matching commercial invoice', 'HS classification under Mexican tariff schedule', 'Declared value in MXN or USD', 'Mexican customs broker license number'],
  commonMistakes: ['Not appointing a Mexican customs broker until last minute', 'Pedimento number not communicated to U.S. broker', 'Cargo description mismatch between Pedimento and commercial invoice'],
  penalty: 'Truck cannot clear Mexican customs. Shipment stuck at border until Pedimento filed and approved.',
};

const CARTA_PORTE: DocRequirement = {
  id: 'carta_porte',
  name: 'Carta Porte / CFDI with Complemento Carta Porte (CCP v3.1)',
  status: 'required',
  source: 'Mexican carrier issues digitally',
  whatItIs: 'A mandatory Mexican digital tax document (CFDI with Complemento Carta Porte, version 3.1 as of July 2024) that must accompany all freight moving through Mexican territory. Contains a UUID — a unique fiscal identification number. For foreign trade operations, this UUID is required to generate the DODA and complete Mexican customs clearance.',
  whyRequired: 'Without the Carta Porte UUID, the Mexican broker cannot file the DODA, the truck cannot clear Mexican customs on the export side, and the shipment cannot legally depart Mexico. Enforcement mandatory since January 1, 2024.',
  mustContain: ['UUID (fiscal folio number)', 'Shipper and receiver information', 'Cargo description and weight', 'Route details', 'Vehicle plate number', 'Driver identification', 'CFDI digital stamp'],
  commonMistakes: ['Not requesting the UUID from the Mexican carrier early enough', 'Using outdated Carta Porte version (must be v3.1)', 'Incorrect cargo weight or description causing SAT audit'],
  penalty: 'Carrier fined by SAT (Mexican tax authority). Shipment impounded. Cannot legally transport goods in Mexico.',
};

const DODA: DocRequirement = {
  id: 'doda',
  name: 'DODA (Documento de Operación para Despacho Aduanero)',
  status: 'required',
  source: 'Generated through Mexican customs system linking Carta Porte to Pedimento',
  whatItIs: 'Mexican customs clearance operation document that links the Carta Porte UUID to the Mexican customs entry (Pedimento). Required for all foreign trade operations crossing the U.S.-Mexico border.',
  whyRequired: 'The DODA connects the transport document (Carta Porte) to the customs declaration (Pedimento). Without it, the shipment is not cleared for international crossing.',
  mustContain: ['Carta Porte UUID reference', 'Pedimento number', 'Customs operation type', 'Border crossing point'],
  commonMistakes: ['Carta Porte UUID not available to generate DODA', 'DODA not generated before truck departure'],
  penalty: 'Truck stopped at Mexican customs checkpoint. Cannot proceed to border crossing.',
};

const PAPS_DOCUMENT: DocRequirement = {
  id: 'paps_document',
  name: 'PAPS Document (Pre-Arrival Processing System)',
  status: 'required',
  source: 'Carrier affixes barcode sticker at pickup; broker pre-files entry using PAPS number',
  whatItIs: 'The land border equivalent of the ocean ISF filing. The carrier places a PAPS barcode sticker on the commercial documents at pickup. This sticker contains a unique cargo control number (CCN) — the carrier code plus a shipment number. The U.S. customs broker uses this number to pre-file the entry with CBP before the truck arrives.',
  whyRequired: 'CBP matches the physical truck to the broker\'s entry filing using the PAPS barcode. If the PAPS number is not in the system or doesn\'t match when the truck arrives, the truck is turned away.',
  mustContain: ['PAPS barcode sticker affixed to documents', 'Cargo control number (carrier code + shipment number)', 'Carrier SCAC code'],
  commonMistakes: ['PAPS sticker not affixed at pickup', 'PAPS number not communicated to broker before departure', 'Broker hasn\'t pre-filed entry when truck arrives at border'],
  penalty: 'Truck turned away from port of entry. Must circle back after entry is filed — significant delay and carrier costs.',
};

const INWARD_CARGO_MANIFEST: DocRequirement = {
  id: 'inward_cargo_manifest',
  name: 'Inward Cargo Manifest',
  status: 'required',
  source: 'U.S. customs broker prepares',
  whatItIs: 'Document prepared by the U.S. customs broker, filed under the Border Cargo Selectivity (BCS) system. The driver presents this at the port of entry. Contains the entry number that CBP uses to match the truck to the filed entry.',
  whyRequired: 'This is what CBP uses to match the physical truck to the electronic entry filing. The driver must have this document to present at primary inspection.',
  mustContain: ['Entry number', 'PAPS/cargo control number', 'Cargo description', 'Consignee details', 'Port of entry'],
  commonMistakes: ['Manifest not given to driver before departure', 'Entry number mismatch', 'Wrong port of entry listed'],
  penalty: 'Driver cannot proceed through primary inspection. Truck held until corrected documents arrive.',
};

const CARTA_INSTRUCCIONES: DocRequirement = {
  id: 'carta_instrucciones',
  name: 'Letter of Instructions (Carta de Instrucciones)',
  status: 'required',
  source: 'U.S. customs broker or freight coordinator prepares',
  whatItIs: 'Contact sheet containing names and phone numbers for all parties involved in the crossing: shipper, consignee, U.S. broker, Mexican broker, carrier, and driver. Standard practice for all Mexico border crossings.',
  whyRequired: 'Coordination between U.S. and Mexican sides requires immediate contact access. If any issue arises at the border, the driver needs to reach the correct person instantly.',
  mustContain: ['Shipper name and phone', 'Consignee name and phone', 'U.S. broker name and phone', 'Mexican broker name and phone', 'Carrier dispatcher name and phone', 'Driver name and cell phone'],
  commonMistakes: ['Outdated contact numbers', 'Missing Mexican broker contact', 'Not providing to driver before departure'],
  penalty: 'No direct penalty but delays escalate rapidly when contacts cannot be reached at the border.',
};

const MEXICAN_BROKER_APPOINTMENT: DocRequirement = {
  id: 'mexican_broker_appointment',
  name: 'Mexican Customs Broker Appointment',
  status: 'required',
  source: 'Shipper or importer appoints licensed Mexican agente aduanal',
  whatItIs: 'Confirmation that a licensed Mexican customs broker (agente aduanal) has been appointed for the Mexico side of this crossing. Every commercial shipment crossing the U.S.-Mexico border requires a licensed customs broker on BOTH sides.',
  whyRequired: 'Neither the U.S. broker nor the carrier can perform Mexican customs clearance. Without a Mexican broker, the Pedimento cannot be filed and the truck cannot clear Mexican customs.',
  mustContain: ['Mexican broker name', 'License number', 'Port of operation', 'Contact details'],
  commonMistakes: ['Not appointing Mexican broker until truck arrives at border', 'Mexican broker operates at different port than planned crossing', 'Assuming U.S. broker handles both sides'],
  penalty: 'Shipment stopped at border. Cannot proceed until Mexican broker appointed and Pedimento filed.',
};

// ══════════════════════════════════════════
// CANADA-SPECIFIC DOCUMENTS
// ══════════════════════════════════════════

const PARS_DOCUMENT: DocRequirement = {
  id: 'pars_document',
  name: 'PARS Document (Pre-Arrival Review System)',
  status: 'required',
  source: 'Carrier affixes PARS barcode; Canadian customs broker pre-files release with CBSA',
  whatItIs: 'Canada\'s pre-clearance system for commercial truck freight — the Canadian equivalent of the U.S. PAPS system. The carrier affixes a PARS barcode sticker at pickup containing a Cargo Control Number (CCN). The Canadian customs broker uses this to submit the release request to CBSA before the truck arrives.',
  whyRequired: 'PARS and the ACI eManifest must BOTH be on file with CBSA at least 1 hour before the driver arrives at the Canadian border. If PARS is not set up, CBSA has no release request to match to the truck and the driver will be turned away.',
  mustContain: ['PARS barcode sticker affixed to documents', 'Cargo Control Number (carrier CBSA code + shipment number)', 'All commercial documents attached'],
  commonMistakes: ['Confusing PARS with ACI eManifest — they are separate systems', 'PARS not filed 1 hour before arrival', 'CCN mismatch between sticker and broker filing'],
  penalty: 'Truck turned away at Canadian border. AMPS penalty possible.',
};

const ACI_EMANIFEST: DocRequirement = {
  id: 'aci_emanifest',
  name: 'ACI eManifest (Advance Commercial Information)',
  status: 'required',
  source: 'Carrier files through CBSA eManifest Portal',
  whatItIs: 'Mandatory electronic pre-arrival filing required by CBSA for all commercial truck crossings into Canada. The carrier — not the customs broker — is responsible for filing this through the CBSA eManifest Portal at least 1 hour before the truck arrives at the Canadian border.',
  whyRequired: 'ACI eManifest and PARS are two completely separate requirements. The carrier handles eManifest, the broker handles PARS. Both must be submitted. Missing or late eManifest filing results in an AMPS penalty of up to $8,000 CAD.',
  mustContain: ['Carrier CBSA code', 'Conveyance details (truck and trailer)', 'Cargo description', 'Shipper and consignee', 'Estimated arrival time', 'Port of entry'],
  commonMistakes: ['Carrier is not ACI-compliant', 'Filed too late (must be 1 hour before arrival)', 'Assuming PARS filing covers eManifest — it does not'],
  penalty: 'Up to $8,000 CAD for non-filing. $750 CAD for late filing. Truck refused entry.',
};

const ACI_LEAD_SHEET: DocRequirement = {
  id: 'aci_lead_sheet',
  name: 'ACI Lead Sheet',
  status: 'required',
  source: 'Generated from eManifest system, given to driver',
  whatItIs: 'Paper document the driver presents to the CBSA officer at the Canadian border. Contains the barcoded Cargo Control Number and confirms the ACI eManifest is on file.',
  whyRequired: 'CBSA officers scan this barcode to pull up the electronic eManifest. Without it, the truck cannot be processed.',
  mustContain: ['Barcoded Cargo Control Number', 'Carrier identification', 'Shipment summary'],
  commonMistakes: ['Driver not given the lead sheet', 'Lead sheet CCN doesn\'t match eManifest'],
  penalty: 'Truck held at border until correct lead sheet produced.',
};

const CAD_FILING: DocRequirement = {
  id: 'cad_filing',
  name: 'Commercial Accounting Declaration (CAD)',
  status: 'required',
  source: 'Canadian customs broker files through CARM Client Portal',
  whatItIs: 'Replaces the old B3 and B2 forms as of October 21, 2024. The Canadian customs broker files the CAD through the CARM Client Portal within 5 business days of release. This is how Canadian duties and taxes are assessed and paid.',
  whyRequired: 'CARM is now the official system of record for all Canadian imports. The CAD is the legal filing that determines Canadian duties, GST/HST, and other fees owed.',
  mustContain: ['HS tariff classification (Canadian schedule)', 'Value for duty', 'Country of origin', 'USMCA claim if applicable', 'Importer Business Number'],
  commonMistakes: ['Filing on old B3 form — no longer accepted', 'Not filing within 5 business days', 'Importer not registered in CARM portal'],
  penalty: 'Late filing penalties under AMPS. Goods may be assessed at highest applicable rate.',
};

const CARM_REGISTRATION: DocRequirement = {
  id: 'carm_registration',
  name: 'CARM Registration Confirmation',
  status: 'required',
  source: 'Canadian importer registers at CARM Client Portal',
  whatItIs: 'The Canadian importer MUST be registered in the CARM Client Portal with a Business Number (BN) and must have posted their own financial security (surety bond or cash deposit) to participate in Release Prior to Payment (RPP). As of May 20, 2025, brokers can no longer use their own security on behalf of the importer.',
  whyRequired: 'Without CARM registration and posted financial security, goods will not be released before duties are paid. The truck sits at the border until payment is made.',
  mustContain: ['Business Number (BN)', 'CARM portal registration status', 'RPP enrollment confirmation', 'Financial security posted (surety bond or cash deposit)', 'Broker delegation confirmed'],
  commonMistakes: ['Importer assumes broker handles CARM registration — they cannot', 'No financial security posted — no RPP', 'Non-resident importer (NRI) not registered directly'],
  penalty: 'Goods held at border until duties paid in full. Significant cash flow and delay impact.',
};

const CANADA_CUSTOMS_INVOICE: DocRequirement = {
  id: 'canada_customs_invoice',
  name: 'Canada Customs Invoice (CCI)',
  status: 'required',
  source: 'Exporter prepares in Canadian format',
  whatItIs: 'A Canadian-format invoice required by CBSA. Different format from the standard U.S. commercial invoice with specific fields required by Canadian customs regulations.',
  whyRequired: 'CBSA requires the CCI format for proper duty assessment. Standard U.S. commercial invoices may not contain all required Canadian fields.',
  mustContain: ['Vendor name and address', 'Consignee name and address', 'Country of origin', 'Place of direct shipment', 'Conditions of sale and terms', 'Currency of settlement', 'Number of packages and description', 'Quantity and selling price'],
  commonMistakes: ['Using U.S. commercial invoice format — missing required Canadian fields', 'Not including all required pricing breakdowns'],
  penalty: 'CBSA may delay processing or assess duties at highest applicable rate.',
};

// ══════════════════════════════════════════
// U.S. EXPORT-SIDE DOCS (for Mexico/Canada export scenarios)
// ══════════════════════════════════════════

const EXPORT_AES: DocRequirement = {
  id: 'aes_filing',
  name: 'AES/EEI Filing (Electronic Export Information)',
  status: 'conditional',
  source: 'U.S. exporter or forwarder files via AESDirect',
  whatItIs: 'Electronic filing with Census Bureau reporting the export. Required for shipments over $2,500 per Schedule B code or any shipment requiring an export license.',
  whyRequired: 'Legal requirement under Foreign Trade Regulations (15 CFR 30). The ITN must be provided to the carrier before export.',
  mustContain: ['USPPI details', 'Ultimate consignee', 'Schedule B number', 'Value and quantity', 'Country of ultimate destination'],
  commonMistakes: ['Not filing because value is "close to $2,500"', 'Wrong ECCN for dual-use goods', 'Filing after export'],
  penalty: '$10,000 per violation. Criminal penalties up to $250,000 for willful violations.',
  condition: 'Required when shipment value exceeds $2,500 per Schedule B code or export license is required',
};

const EXPORT_SLI: DocRequirement = {
  id: 'shipper_letter_instruction',
  name: 'Shipper\'s Letter of Instructions (SLI)',
  status: 'required',
  source: 'U.S. exporter provides to forwarder',
  whatItIs: 'Written instructions from the exporter to the freight forwarder/broker authorizing them to act as agent for export filing.',
  whyRequired: 'Establishes the legal authority chain for export compliance when using a forwarder.',
  mustContain: ['Exporter details', 'Consignee details', 'Commodity description', 'AES filing authorization'],
  commonMistakes: ['No SLI but forwarder files AES', 'SLI details don\'t match AES filing'],
  penalty: 'Compliance gap during BIS/Census audit.',
};

const EXPORT_LICENSE: DocRequirement = {
  id: 'export_license',
  name: 'Export License or License Exception Determination',
  status: 'conditional',
  source: 'BIS or DDTC issues; exporter applies',
  whatItIs: 'Authorization from the Bureau of Industry and Security (BIS) or State Department (DDTC/ITAR) to export controlled goods, software, or technology.',
  whyRequired: 'Exporting controlled items without proper authorization is a federal crime. Must be obtained BEFORE any export activity.',
  mustContain: ['License number or exception citation', 'ECCN or USML category', 'Authorized parties', 'Authorized destination', 'Quantity and value limits'],
  commonMistakes: ['Assuming NLR (No License Required) without proper classification', 'License expired', 'Exceeding authorized quantities'],
  penalty: 'Criminal penalties up to $250,000 and 10 years imprisonment. Civil penalties up to $300,000 per violation.',
  condition: 'Required for controlled goods under EAR or ITAR',
};

const DENIED_PARTY_SCREENING: DocRequirement = {
  id: 'denied_party_screening',
  name: 'Denied Party Screening Certificate',
  status: 'required',
  source: 'Auto-run screening system',
  whatItIs: 'Screening of all transaction parties against U.S. government denied/restricted party lists.',
  whyRequired: 'Federal law prohibits exports to denied parties. Screening required for every export shipment.',
  mustContain: ['Screening timestamp', 'All 5 list results', 'Match/no-match determination'],
  commonMistakes: ['Only screening the buyer', 'Not re-screening when end-user changes'],
  penalty: 'Criminal penalties. Up to $300,000 per violation for BIS. Up to $1,000,000 for OFAC.',
};

const DESTINATION_CONTROL: DocRequirement = {
  id: 'destination_control',
  name: 'Destination Control Statement',
  status: 'conditional',
  source: 'U.S. exporter adds to commercial documents',
  whatItIs: 'Statement on commercial invoice and BOL that goods are subject to U.S. export controls and may not be diverted to unauthorized destinations.',
  whyRequired: 'Required for items classified under EAR with an ECCN other than EAR99.',
  mustContain: ['Standard DCS language per 15 CFR 758.6', 'Country of ultimate destination'],
  commonMistakes: ['Missing DCS on shipping documents', 'Using outdated DCS language'],
  penalty: '$10,000 per violation.',
  condition: 'Required for goods classified under EAR with ECCN other than EAR99',
};

// ══════════════════════════════════════════
// PGA FILINGS (shared across land modes)
// ══════════════════════════════════════════

const LAND_PGA_DOCS: DocRequirement[] = [
  {
    id: 'fda_prior_notice', name: 'FDA Prior Notice', status: 'conditional',
    source: 'Customs broker or importer files via FDA FURLS',
    whatItIs: 'Advance notification to FDA for food, cosmetics, drugs, and medical devices.',
    whyRequired: 'Bioterrorism Act of 2002. Must be filed before arrival.',
    mustContain: ['FDA product code', 'Manufacturer info', 'Country of production', 'Anticipated arrival'],
    commonMistakes: ['Filed after arrival — automatic refusal', 'Wrong FDA product code'],
    penalty: 'Goods refused admission. Re-export at importer cost ($3,000–$15,000).',
    condition: 'Food, beverages, cosmetics, drugs, medical devices, dietary supplements',
    commodityTriggers: ['food', 'beverage', 'cosmetic', 'pharmaceutical', 'medical_device', 'dietary_supplement'],
  },
  {
    id: 'usda_aphis_permit', name: 'USDA/APHIS Import Permit', status: 'conditional',
    source: 'USDA issues; importer applies',
    whatItIs: 'Permit for importing agricultural products, plants, and animals.',
    whyRequired: 'Prevents introduction of foreign pests and diseases into U.S. agriculture.',
    mustContain: ['Permit number', 'Authorized commodities', 'Origin country', 'Port of entry'],
    commonMistakes: ['Permit for wrong port of entry', 'Commodity not covered by permit'],
    penalty: 'Goods refused entry. USDA destruction order for quarantine pests.',
    condition: 'Agricultural products, plants, live animals',
    commodityTriggers: ['agricultural', 'plant', 'animal', 'produce', 'fruit', 'vegetable'],
  },
  {
    id: 'phytosanitary_certificate', name: 'Phytosanitary Certificate', status: 'conditional',
    source: 'Origin country plant protection authority',
    whatItIs: 'Government-issued certificate confirming plants/produce are free of quarantine pests.',
    whyRequired: 'Required by USDA for most plant-origin products.',
    mustContain: ['Issuing authority', 'Scientific name of plants', 'Treatment details', 'Place of origin'],
    commonMistakes: ['Certificate expired', 'Doesn\'t cover all commodities in shipment'],
    penalty: 'Goods held for USDA inspection. Potential fumigation or destruction.',
    condition: 'Produce, plants, wood products',
    commodityTriggers: ['produce', 'plant', 'wood', 'fruit', 'vegetable', 'flower', 'timber'],
  },
  {
    id: 'fumigation_ispm15', name: 'Fumigation / ISPM-15 Certificate', status: 'conditional',
    source: 'Treatment provider in origin country',
    whatItIs: 'Certificate confirming wood packaging materials have been treated per ISPM-15 standards.',
    whyRequired: 'All wood packaging crossing borders must be ISPM-15 compliant.',
    mustContain: ['ISPM-15 mark on packaging', 'Treatment type (HT or MB)', 'Treatment provider registration'],
    commonMistakes: ['Pallets not stamped with ISPM-15 mark', 'Using raw/untreated wood'],
    penalty: 'Cargo held. Fumigation at port ($500–$2,000). Re-export of non-compliant packaging.',
    condition: 'All shipments using wood packaging materials',
    commodityTriggers: ['wood', 'pallet', 'crate'],
  },
  {
    id: 'sds_msds', name: 'SDS / MSDS Safety Data Sheets', status: 'conditional',
    source: 'Manufacturer or chemical supplier',
    whatItIs: 'Safety Data Sheets for chemicals, hazardous materials, and batteries.',
    whyRequired: 'DOT and EPA requirements for transport and import of hazardous materials.',
    mustContain: ['16-section GHS format', 'UN number', 'Proper shipping name', 'Hazard classification'],
    commonMistakes: ['Outdated SDS format', 'Missing UN classification'],
    penalty: 'DOT fines for improper hazmat documentation. EPA penalties for TSCA violations.',
    condition: 'Chemicals, hazardous materials, batteries',
    commodityTriggers: ['chemical', 'hazmat', 'battery', 'paint', 'solvent', 'adhesive'],
  },
  {
    id: 'epa_tsca', name: 'EPA TSCA Certification', status: 'conditional',
    source: 'Importer certifies',
    whatItIs: 'Toxic Substances Control Act certification for chemical imports.',
    whyRequired: 'EPA requires TSCA certification for all chemical imports at time of entry.',
    mustContain: ['Compliance statement', 'CAS registry numbers', 'Importer signature'],
    commonMistakes: ['Not realizing product contains regulated chemicals', 'Missing CAS numbers'],
    penalty: 'EPA penalty up to $37,500 per day per violation.',
    condition: 'Chemical substances and mixtures',
    commodityTriggers: ['chemical', 'paint', 'plastic', 'resin'],
  },
  {
    id: 'cpsc_certificate', name: 'CPSC Compliance Certificate', status: 'conditional',
    source: 'Importer or manufacturer',
    whatItIs: 'Certificate that consumer products meet applicable CPSC safety standards.',
    whyRequired: 'Required for all consumer products, especially children\'s products (CPSIA).',
    mustContain: ['Applicable safety standard', 'Test results from accredited lab', 'Product identification'],
    commonMistakes: ['No third-party testing for children\'s products', 'Generic certificate without specific standards'],
    penalty: 'Product recall. Civil penalty up to $100,000 per violation.',
    condition: 'Consumer goods, children\'s products',
    commodityTriggers: ['consumer', 'children', 'toy', 'juvenile'],
  },
  {
    id: 'sima_license', name: 'SIMA Steel Import License', status: 'conditional',
    source: 'Importer obtains from Commerce Department',
    whatItIs: 'Steel Import Monitoring and Analysis license required for all steel mill product imports.',
    whyRequired: 'Commerce Department monitors all steel imports. License must be obtained before entry filing.',
    mustContain: ['SIMA license number', 'Steel product category', 'Country of origin', 'Quantity'],
    commonMistakes: ['Not obtaining license before filing entry', 'Wrong product category'],
    penalty: 'Entry rejected until SIMA license obtained.',
    condition: 'Steel mill products',
    commodityTriggers: ['steel', 'iron', 'aluminum'],
  },
];

// ══════════════════════════════════════════
// CANADA PGA EQUIVALENTS
// ══════════════════════════════════════════

const CANADA_PGA_DOCS: DocRequirement[] = [
  {
    id: 'cfia_permit', name: 'CFIA Permit (Canadian Food Inspection Agency)', status: 'conditional',
    source: 'Canadian importer obtains from CFIA',
    whatItIs: 'Permit for importing food, plants, and animals into Canada. Equivalent of USDA/APHIS.',
    whyRequired: 'CFIA regulates all food safety and plant/animal health for Canadian imports.',
    mustContain: ['CFIA permit number', 'Authorized commodities', 'Validity dates'],
    commonMistakes: ['Using U.S. USDA permit — not valid in Canada', 'Expired permit'],
    penalty: 'Goods refused entry into Canada. Potential destruction order.',
    condition: 'Food, plants, animals entering Canada',
    commodityTriggers: ['food', 'produce', 'plant', 'animal', 'agricultural'],
  },
  {
    id: 'health_canada', name: 'Health Canada Documentation', status: 'conditional',
    source: 'Canadian importer obtains from Health Canada',
    whatItIs: 'Authorization for importing pharmaceuticals, medical devices, and health products into Canada.',
    whyRequired: 'Health Canada regulates all health products entering the country.',
    mustContain: ['Drug Identification Number (DIN) or Device License', 'Product classification', 'Establishment license'],
    commonMistakes: ['Assuming U.S. FDA approval is sufficient — it is not', 'No Canadian device license'],
    penalty: 'Products refused entry. Potential seizure.',
    condition: 'Pharmaceuticals, medical devices, health products',
    commodityTriggers: ['pharmaceutical', 'medical_device', 'health', 'cosmetic'],
  },
  {
    id: 'ised_certification', name: 'ISED Certification (Innovation, Science and Economic Development)', status: 'conditional',
    source: 'Product must comply with ISED standards',
    whatItIs: 'Canadian equivalent of FCC. Certification for electronics and radio equipment entering Canada.',
    whyRequired: 'All electronic and radio-frequency devices must comply with ISED technical standards.',
    mustContain: ['ISED certification number', 'Equipment category', 'Test report reference'],
    commonMistakes: ['Assuming FCC certification covers Canada — it does not', 'No ISED ID on product label'],
    penalty: 'Products cannot be legally sold or distributed in Canada.',
    condition: 'Electronics, radio equipment, telecom devices',
    commodityTriggers: ['electronic', 'telecom', 'radio', 'wireless'],
  },
  {
    id: 'transport_canada', name: 'Transport Canada Documentation', status: 'conditional',
    source: 'Manufacturer or importer provides',
    whatItIs: 'Documentation for vehicles, dangerous goods (TDG), and products requiring WHMIS labeling in Canada.',
    whyRequired: 'Transport Canada regulates vehicle safety standards and dangerous goods transportation in Canada.',
    mustContain: ['CMVSS compliance (vehicles)', 'TDG documentation (dangerous goods)', 'WHMIS labels (chemicals)'],
    commonMistakes: ['U.S. DOT compliance doesn\'t equal Transport Canada compliance', 'Missing WHMIS labels for chemicals'],
    penalty: 'Vehicles refused import. TDG violations: fines up to $50,000 CAD.',
    condition: 'Vehicles, dangerous goods, chemicals requiring WHMIS',
    commodityTriggers: ['vehicle', 'auto', 'chemical', 'hazmat', 'dangerous'],
  },
];

// ══════════════════════════════════════════
// DEADLINES
// ══════════════════════════════════════════

const MEXICO_IMPORT_DEADLINES: FilingDeadline[] = [
  { name: 'PAPS Pre-Filing', rule: 'Entry must be pre-filed via PAPS before truck arrives at border', penalty: 'Truck turned away from port of entry', offsetHours: -4, offsetFrom: 'arrival' },
  { name: 'Pedimento Filing', rule: 'Mexican Pedimento must be filed before truck departs Mexico', penalty: 'Truck cannot clear Mexican customs', offsetHours: -8, offsetFrom: 'departure' },
  { name: 'Customs Entry', rule: 'Filed before truck arrival via PAPS — not 15-day window like ocean', penalty: 'Truck held at border', offsetHours: 0, offsetFrom: 'arrival' },
  { name: 'Entry Summary (7501)', rule: '10 working days from entry/release date', penalty: 'Liquidated damages', offsetHours: 14 * 24, offsetFrom: 'arrival' },
];

const MEXICO_EXPORT_DEADLINES: FilingDeadline[] = [
  { name: 'AES/EEI Filing', rule: 'Must obtain ITN before cargo delivered to carrier', penalty: '$10,000 per violation', offsetHours: -48, offsetFrom: 'departure' },
  { name: 'Denied Party Screening', rule: 'Must be completed before export', penalty: 'Criminal penalties up to $300,000', offsetHours: -72, offsetFrom: 'departure' },
  { name: 'Pedimento Filing (Mexico Import)', rule: 'Mexican broker must file before truck clears Mexican customs', penalty: 'Truck held at Mexican border', offsetHours: 4, offsetFrom: 'arrival' },
];

const CANADA_IMPORT_DEADLINES: FilingDeadline[] = [
  { name: 'PAPS Pre-Filing', rule: 'Entry must be pre-filed via PAPS before truck arrives at border', penalty: 'Truck turned away from port of entry', offsetHours: -4, offsetFrom: 'arrival' },
  { name: 'Customs Entry', rule: 'Filed before truck arrival via PAPS', penalty: 'Truck held at border', offsetHours: 0, offsetFrom: 'arrival' },
  { name: 'Entry Summary (7501)', rule: '10 working days from entry/release date', penalty: 'Liquidated damages', offsetHours: 14 * 24, offsetFrom: 'arrival' },
];

const CANADA_EXPORT_DEADLINES: FilingDeadline[] = [
  { name: 'AES/EEI Filing', rule: 'Must obtain ITN before cargo delivered to carrier', penalty: '$10,000 per violation', offsetHours: -48, offsetFrom: 'departure' },
  { name: 'ACI eManifest', rule: 'Carrier must file at least 1 hour before arriving at Canadian border', penalty: 'Up to $8,000 CAD penalty', offsetHours: -1, offsetFrom: 'arrival' },
  { name: 'PARS Filing', rule: 'Canadian broker must submit release request at least 1 hour before border arrival', penalty: 'Truck turned away', offsetHours: -1, offsetFrom: 'arrival' },
  { name: 'CAD Filing', rule: 'Canadian broker files within 5 business days of release', penalty: 'AMPS penalties', offsetHours: 7 * 24, offsetFrom: 'arrival' },
];

// ══════════════════════════════════════════
// KEY RISKS
// ══════════════════════════════════════════

const MEXICO_IMPORT_RISKS: KeyRisk[] = [
  { title: 'Carta Porte UUID Missing', description: 'Truck departs Mexico without valid Carta Porte — impounded at checkpoint', severity: 'critical', averageFine: 'Shipment impounded + SAT fine', preventionTip: 'Request Carta Porte UUID from Mexican carrier before truck departs' },
  { title: 'No Mexican Customs Broker', description: 'No agente aduanal appointed for Mexico side of crossing', severity: 'critical', averageFine: 'Indefinite border delay', preventionTip: 'Confirm Mexican broker appointment before booking freight' },
  { title: 'PAPS Mismatch', description: 'PAPS barcode number doesn\'t match broker\'s pre-filed entry', severity: 'high', averageFine: '$500–$2,000 in carrier delays', preventionTip: 'Verify PAPS number with carrier and broker before truck departs' },
  { title: 'Section 301 Over-Application', description: 'Incorrectly applying Section 301 tariffs to Mexico-origin goods', severity: 'medium', averageFine: 'Overpaid duties', preventionTip: 'Section 301 does NOT apply to Mexico-origin goods — verify origin' },
  { title: 'USMCA Documentation Gap', description: 'Claiming USMCA but missing one of the 9 required data elements', severity: 'high', averageFine: 'Full MFN duty rate applied', preventionTip: 'Verify all 9 USMCA certification elements before filing' },
];

const MEXICO_EXPORT_RISKS: KeyRisk[] = [
  { title: 'Missing EEI/AES Filing', description: 'Exporting without Electronic Export Information when required', severity: 'critical', averageFine: '$10,000 per violation', preventionTip: 'File AES for all shipments over $2,500 per Schedule B code' },
  { title: 'Denied Party Match', description: 'Exporting to a party on U.S. sanctions lists', severity: 'critical', averageFine: '$300,000+', preventionTip: 'Screen all parties before every shipment' },
  { title: 'NOM Non-Compliance', description: 'Products don\'t meet Mexican NOM safety standards', severity: 'high', averageFine: 'Goods refused by Mexican customs', preventionTip: 'Verify NOM requirements for your product category with Mexican broker' },
];

const CANADA_IMPORT_RISKS: KeyRisk[] = [
  { title: 'PAPS Mismatch', description: 'PAPS number doesn\'t match pre-filed entry', severity: 'high', averageFine: '$500–$2,000 in delays', preventionTip: 'Verify PAPS number with carrier and broker before departure' },
  { title: 'USMCA Documentation Gap', description: 'USMCA claim missing required data elements', severity: 'high', averageFine: 'Full MFN duty + MPF applied', preventionTip: 'USMCA for Canada goods also exempts MPF — verify all 9 elements' },
  { title: 'Section 301 Over-Application', description: 'Incorrectly applying Section 301 tariffs to Canada-origin goods', severity: 'medium', averageFine: 'Overpaid duties', preventionTip: 'Section 301 does NOT apply to Canada-origin goods' },
];

const CANADA_EXPORT_RISKS: KeyRisk[] = [
  { title: 'ACI eManifest Not Filed', description: 'Carrier fails to file ACI eManifest 1 hour before border arrival', severity: 'critical', averageFine: '$8,000 CAD', preventionTip: 'Confirm carrier is ACI-compliant and has filed before truck departs' },
  { title: 'CARM Registration Gap', description: 'Canadian importer not registered in CARM portal or no financial security posted', severity: 'critical', averageFine: 'Goods held until duties paid in cash', preventionTip: 'Verify CARM registration and RPP enrollment before shipping' },
  { title: 'PARS Not Filed', description: 'Canadian broker hasn\'t submitted PARS release request', severity: 'high', averageFine: 'Truck turned away at border', preventionTip: 'Confirm both ACI eManifest AND PARS are filed 1+ hour before arrival' },
  { title: 'Missing EEI/AES Filing', description: 'U.S. export side not filed when required', severity: 'critical', averageFine: '$10,000 per violation', preventionTip: 'File AES for all shipments over $2,500' },
];

// ══════════════════════════════════════════
// ASSEMBLED PROFILES
// ══════════════════════════════════════════

export const LAND_IMPORT_MEXICO_PROFILE: ModeDocProfile = {
  modeId: 'land_import_mexico',
  required: [
    // Phase 0 — Authority & Bond
    { ...LAND_CUSTOMS_BOND },
    { ...LAND_ACH },
    // Phase 1 — Commercial
    { ...MEXICO_COMMERCIAL_INVOICE_SPANISH },
    { ...LAND_PACKING_LIST },
    { ...LAND_TRUCK_BOL },
    // Phase 2 — Mexico-Side
    { ...PEDIMENTO },
    { ...CARTA_PORTE },
    { ...DODA },
    { ...MEXICAN_BROKER_APPOINTMENT },
    // Phase 2B — Pre-Arrival
    { ...PAPS_DOCUMENT },
    { ...INWARD_CARGO_MANIFEST },
    { ...CARTA_INSTRUCCIONES },
    // Phase 3 — Entry Filing
    { ...LAND_ENTRY_3461 },
    { ...LAND_ENTRY_7501 },
    { ...LAND_HTS_WORKSHEET },
    { ...LAND_DELIVERY_ORDER },
    // Phase 4 — Origin & Compliance
    { ...LAND_COO_DECLARATION },
    { ...LAND_ADCVD },
    // Phase 6 — Post-Release
    { ...LAND_RESTRICTED_PARTY },
  ],
  conditional: [
    { ...LAND_USMCA },
    { ...LAND_MANUFACTURER_AFFIDAVIT },
    { ...LAND_TRANSFER_PRICING },
    {
      id: 'freight_invoice', name: 'Freight Invoice', status: 'conditional',
      source: 'Carrier or freight forwarder',
      whatItIs: 'Invoice showing freight charges. Required when freight value must be added to dutiable value.',
      whyRequired: 'Under CIF or CFR Incoterms, freight is part of the dutiable value.',
      mustContain: ['Freight charges in USD', 'Shipment reference', 'Origin and destination'],
      commonMistakes: ['Missing when CIF terms used', 'Charges in foreign currency without conversion'],
      penalty: 'Incorrect dutiable value — 19 U.S.C. 1592 penalty.',
      condition: 'Required when freight value must be added to dutiable value (CIF/CFR Incoterms)',
    },
    {
      id: 'purchase_order', name: 'Purchase Order / Sales Contract', status: 'conditional',
      source: 'Buyer issues to seller',
      whatItIs: 'The purchase order or sales contract establishing the terms of the transaction.',
      whyRequired: 'Supports the declared value and transaction terms for CBP verification.',
      mustContain: ['PO number', 'Item descriptions', 'Agreed prices', 'Delivery terms'],
      commonMistakes: ['PO price doesn\'t match invoice price'],
      penalty: 'No direct penalty but weakens value defense in CBP audit.',
      condition: 'Recommended for all shipments; critical for related-party transactions',
    },
    ...LAND_PGA_DOCS,
  ],
  optional: [],
  filingDeadlines: MEXICO_IMPORT_DEADLINES,
  keyRisks: MEXICO_IMPORT_RISKS,
};

export const LAND_EXPORT_MEXICO_PROFILE: ModeDocProfile = {
  modeId: 'land_export_mexico',
  required: [
    // Phase 1 — U.S. Export Side
    { ...MEXICO_COMMERCIAL_INVOICE_SPANISH },
    { ...LAND_PACKING_LIST },
    { ...LAND_TRUCK_BOL },
    { ...EXPORT_SLI },
    { ...DENIED_PARTY_SCREENING },
    // Phase 2 — Mexico Import Side (coordinate with Mexican broker)
    { ...PEDIMENTO },
    { ...CARTA_PORTE },
    { ...MEXICAN_BROKER_APPOINTMENT },
    // Phase 3 — Carrier & Crossing
    { ...PAPS_DOCUMENT },
    { ...INWARD_CARGO_MANIFEST },
  ],
  conditional: [
    { ...EXPORT_AES },
    { ...EXPORT_LICENSE },
    { ...DESTINATION_CONTROL },
    { ...LAND_USMCA },
    {
      id: 'nom_compliance', name: 'NOM Compliance Documentation', status: 'conditional',
      source: 'Mexican importer or testing lab verifies compliance',
      whatItIs: 'Normas Oficiales Mexicanas — Mexican product safety standards. Required for regulated product categories including electronics, food, textiles, toys, and chemicals.',
      whyRequired: 'Mexican customs will not release goods that require NOM compliance without proper documentation. The Mexican broker verifies this.',
      mustContain: ['Applicable NOM standard number', 'Compliance certificate or test report', 'Product category', 'NOM mark on product/packaging'],
      commonMistakes: ['Not checking NOM requirements before shipping', 'Assuming U.S. UL/FCC certification covers NOM'],
      penalty: 'Goods refused by Mexican customs. Storage charges accrue. Potential re-export.',
      condition: 'Electronics, food, textiles, toys, chemicals entering Mexico',
      commodityTriggers: ['electronic', 'food', 'textile', 'toy', 'chemical'],
    },
    {
      id: 'mexico_import_permit', name: 'Mexican Import Permits', status: 'conditional',
      source: 'Mexican importer obtains from relevant Mexican authority',
      whatItIs: 'Import permits required by Mexican government for restricted commodity categories.',
      whyRequired: 'Certain goods require advance authorization from Mexican regulatory agencies.',
      mustContain: ['Permit number', 'Authorized commodities', 'Validity dates', 'Issuing agency'],
      commonMistakes: ['Assuming no permit needed because goods are freely exported from U.S.'],
      penalty: 'Goods refused entry into Mexico.',
      condition: 'Restricted commodities entering Mexico',
    },
    {
      id: 'transload_receipt', name: 'Transfer Documentation / Transload Receipt', status: 'conditional',
      source: 'Border transload facility',
      whatItIs: 'Documentation of freight transfer at the border from one carrier to another.',
      whyRequired: 'When freight is transloaded at the border, both carriers must be documented and the chain of custody recorded.',
      mustContain: ['Original carrier details', 'Transfer carrier details', 'Cargo count verification', 'Seal numbers if applicable'],
      commonMistakes: ['Missing documentation of carrier change', 'Cargo count discrepancy not caught at transload'],
      penalty: 'Customs hold if carrier of record is unclear.',
      condition: 'Required when crossing method is Transload (freight transferred at border)',
    },
  ],
  optional: [],
  filingDeadlines: MEXICO_EXPORT_DEADLINES,
  keyRisks: MEXICO_EXPORT_RISKS,
};

export const LAND_IMPORT_CANADA_PROFILE: ModeDocProfile = {
  modeId: 'land_import_canada',
  required: [
    // Phase 0 — Authority & Bond
    { ...LAND_CUSTOMS_BOND },
    { ...LAND_ACH },
    // Phase 1 — Commercial
    { ...LAND_COMMERCIAL_INVOICE },
    { ...LAND_PACKING_LIST },
    { ...LAND_TRUCK_BOL },
    // Phase 2B — Pre-Arrival
    { ...PAPS_DOCUMENT },
    { ...INWARD_CARGO_MANIFEST },
    // Phase 3 — Entry Filing
    { ...LAND_ENTRY_3461 },
    { ...LAND_ENTRY_7501 },
    { ...LAND_HTS_WORKSHEET },
    { ...LAND_DELIVERY_ORDER },
    // Phase 4 — Origin & Compliance
    { ...LAND_COO_DECLARATION },
    { ...LAND_ADCVD },
    // Phase 6 — Post-Release
    { ...LAND_RESTRICTED_PARTY },
  ],
  conditional: [
    { ...LAND_USMCA },
    { ...LAND_MANUFACTURER_AFFIDAVIT },
    { ...LAND_TRANSFER_PRICING },
    {
      ...CANADA_CUSTOMS_INVOICE,
      status: 'conditional' as const,
      condition: 'May be required for cross-reference with Canadian customs records',
    },
    {
      id: 'purchase_order', name: 'Purchase Order / Sales Contract', status: 'conditional',
      source: 'Buyer issues to seller',
      whatItIs: 'The purchase order or sales contract.',
      whyRequired: 'Supports declared value verification.',
      mustContain: ['PO number', 'Item descriptions', 'Prices', 'Terms'],
      commonMistakes: ['PO price doesn\'t match invoice'],
      penalty: 'Weakens value defense in audit.',
      condition: 'Recommended for all shipments',
    },
    ...LAND_PGA_DOCS,
  ],
  optional: [],
  filingDeadlines: CANADA_IMPORT_DEADLINES,
  keyRisks: CANADA_IMPORT_RISKS,
};

export const LAND_EXPORT_CANADA_PROFILE: ModeDocProfile = {
  modeId: 'land_export_canada',
  required: [
    // Phase 1 — U.S. Export Side
    { ...LAND_COMMERCIAL_INVOICE },
    { ...LAND_PACKING_LIST },
    { ...LAND_TRUCK_BOL },
    { ...EXPORT_SLI },
    { ...DENIED_PARTY_SCREENING },
    // Phase 2 — Canada Import Side (CARM system)
    { ...ACI_EMANIFEST },
    { ...PARS_DOCUMENT },
    { ...ACI_LEAD_SHEET },
    { ...CAD_FILING },
    { ...CARM_REGISTRATION },
    { ...CANADA_CUSTOMS_INVOICE },
  ],
  conditional: [
    { ...EXPORT_AES },
    { ...EXPORT_LICENSE },
    { ...DESTINATION_CONTROL },
    { ...LAND_USMCA },
    ...CANADA_PGA_DOCS,
    {
      id: 'transload_receipt', name: 'Transfer Documentation / Transload Receipt', status: 'conditional',
      source: 'Border transload facility',
      whatItIs: 'Documentation of freight transfer at the border.',
      whyRequired: 'Both carriers must be documented when freight is transloaded.',
      mustContain: ['Original carrier', 'Transfer carrier', 'Cargo count', 'Seal numbers'],
      commonMistakes: ['Missing carrier change documentation'],
      penalty: 'Customs hold if carrier of record unclear.',
      condition: 'Required when crossing method is Transload',
    },
  ],
  optional: [],
  filingDeadlines: CANADA_EXPORT_DEADLINES,
  keyRisks: CANADA_EXPORT_RISKS,
};

// ══════════════════════════════════════════
// LAND-SPECIFIC PROFILE FIELDS
// ══════════════════════════════════════════

export const MEXICO_BORDER_CROSSINGS = [
  'Laredo, TX', 'El Paso, TX', 'Otay Mesa, CA', 'Nogales, AZ',
  'Pharr, TX', 'Eagle Pass, TX', 'Brownsville, TX', 'El Paso-Ysleta, TX',
];

export const CANADA_BORDER_CROSSINGS = [
  'Detroit, MI (Ambassador Bridge)', 'Detroit, MI (Gordie Howe Bridge)',
  'Buffalo, NY (Peace Bridge)', 'Blaine, WA (Pacific Highway)',
  'Port Huron, MI', 'Sweetgrass, MT', 'Pembina, ND', 'Lacolle, QC',
];

export interface LandFreightProfileFields {
  borderCrossing: string;
  crossingType: 'through_trailer' | 'transload';
  mexicanBrokerName?: string;
  mexicanBrokerContact?: string;
  canadianBrokerName?: string;
  canadianBrokerContact?: string;
  fastLaneCertified: boolean;
  ctpatCertified: boolean;
  csaEnrolled?: boolean;
  carmRegistrationStatus?: 'confirmed' | 'pending' | 'not_registered';
  canadianImporterBN?: string;
  aciServiceProvider?: string;
  carrierOfRecord?: string;
  transferCarrier?: string;
  immexStatus?: 'enrolled' | 'not_applicable';
  driverVisaNote?: string;
}
