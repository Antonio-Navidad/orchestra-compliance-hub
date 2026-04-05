import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfUse() {
  const navigate = useNavigate();
  const lastUpdated = "April 4, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-base">Orchestra AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Critical Legal Disclaimer Box */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
            Important Legal Notice — Not a Licensed Customs Broker
          </p>
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Orchestra AI is a pre-filing compliance <strong>audit tool</strong>, not a licensed customs broker or customs
            business under 19 USC 1641. Orchestra AI does not file customs entries, prepare entry documentation for CBP
            submission, classify goods for official entry purposes, or represent importers before CBP or any government
            agency. All outputs are for informational and internal pre-filing review purposes only. You must engage a
            licensed U.S. customs broker for all formal entry filing requirements.
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By creating an account, accessing, or using the Orchestra AI platform ("Platform"), you agree
              to be bound by these Terms of Use ("Terms") and our Privacy Policy. If you do not agree,
              do not use the Platform. These Terms constitute a binding legal agreement between you and
              Orchestra AI.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you are using the Platform on behalf of a company or other legal entity, you represent that
              you have authority to bind that entity to these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Description of Service</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI provides AI-powered pre-filing customs compliance tools including:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Document data extraction from commercial invoices, bills of lading, packing lists, and related customs documents</li>
              <li>Cross-reference analysis to identify discrepancies between documents</li>
              <li>HTS tariff classification guidance at the 6-digit level only</li>
              <li>Compliance exception reporting and recommendations for pre-filing review</li>
              <li>Mode-specific compliance checklists for ocean, land (Mexico/Canada), and air freight</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All outputs are advisory in nature. Orchestra AI does not guarantee accuracy, completeness,
              or fitness for any specific customs filing or regulatory purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Customs Broker Disclosure (19 USC 1641)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI is <strong>not a licensed customs broker</strong> under 19 USC 1641 and does not
              conduct "customs business" as defined by that statute. Specifically, Orchestra AI:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong>Does not</strong> prepare or file CBP entry documentation on behalf of importers</li>
              <li><strong>Does not</strong> file or submit CBP Form 5106 (Importer ID Input Record) on behalf of any party</li>
              <li><strong>Does not</strong> represent importers or exporters before U.S. Customs and Border Protection (CBP)</li>
              <li><strong>Does not</strong> provide 10-digit HTS classification for official entry purposes</li>
              <li><strong>Does not</strong> provide binding tariff rulings or legal advice</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All HTS tariff classification guidance provided by Orchestra AI is at the <strong>6-digit level only</strong>,
              consistent with CBP Ruling H350722 (January 2026), and is provided solely to assist your
              licensed customs broker in pre-filing review.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Subscription Plans and Billing</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Free Tier</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  New accounts receive 5 free validation credits. Credits do not roll over and are not
                  refundable. Free tier access may be modified or discontinued with 30 days' notice.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Paid Subscriptions</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  Paid plans are billed monthly in advance. Subscriptions auto-renew unless cancelled at
                  least 24 hours before the renewal date. All payments are processed by Stripe, Inc.
                  Prices are listed in USD and are exclusive of applicable taxes.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Refunds</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  Subscription fees are non-refundable except where required by applicable law. If you
                  cancel mid-cycle, you retain access until the end of your paid billing period.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">You agree not to:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Use the Platform for any unlawful purpose or in violation of any applicable law or regulation</li>
              <li>Attempt to circumvent rate limits, authentication, or access controls</li>
              <li>Upload documents containing third-party personal data without appropriate authorization</li>
              <li>Use the Platform to facilitate customs fraud, smuggling, or evasion of import duties</li>
              <li>Reverse engineer, decompile, or attempt to extract the Platform's source code or AI models</li>
              <li>Resell, sublicense, or white-label the Platform's outputs without written permission</li>
              <li>Submit documents or data belonging to parties with whom you have no authorized business relationship</li>
              <li>Use automated scripts or bots to interact with the Platform beyond its intended API usage</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Accuracy and Limitation of Outputs</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI's outputs are generated using artificial intelligence and automated rule engines.
              While we strive for accuracy, AI-generated compliance recommendations may contain errors,
              omissions, or outdated regulatory information. You acknowledge that:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>All compliance recommendations must be reviewed and validated by a licensed U.S. customs broker before acting on them</li>
              <li>Tariff rates, regulatory requirements, and trade policies change frequently — always verify current requirements with CBP or your broker</li>
              <li>Orchestra AI is not responsible for any customs holds, penalties, fines, or duties resulting from reliance on Platform outputs</li>
              <li>ISF 10+2 filings, formal entry submissions, and all CBP interactions must be performed by a licensed customs broker</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Platform, including its software, AI models, compliance rule engines, visual design, and
              content, is owned by Orchestra AI and protected by applicable intellectual property laws.
              You are granted a limited, non-exclusive, non-transferable license to use the Platform for
              your internal business purposes during your subscription term.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You retain ownership of documents you upload. By uploading documents, you grant Orchestra AI
              a limited license to process them for the purpose of providing the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Disclaimer of Warranties</h2>
            <p className="text-sm leading-relaxed text-muted-foreground uppercase font-semibold text-xs">
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT. ORCHESTRA AI DOES NOT WARRANT
              THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground uppercase font-semibold text-xs">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ORCHESTRA AI SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              CUSTOMS PENALTIES, FINES, DUTIES, CUSTOMS HOLDS, LOST PROFITS, OR LOSS OF DATA,
              ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE PLATFORM. IN NO EVENT SHALL
              ORCHESTRA AI'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID IN THE THREE (3) MONTHS
              PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Indemnification</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You agree to indemnify, defend, and hold harmless Orchestra AI and its officers, directors,
              employees, and agents from any claims, damages, losses, or expenses (including reasonable
              attorneys' fees) arising from: (a) your use of the Platform; (b) your violation of these
              Terms; (c) your violation of any law or third-party right; or (d) any customs penalty or
              government action resulting from your reliance on Platform outputs without licensed broker review.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Termination</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We reserve the right to suspend or terminate your account immediately, without notice, if you
              violate these Terms or engage in fraudulent, abusive, or illegal activity. Upon termination,
              your right to use the Platform ceases immediately. Sections 6, 8, 9, 10, and 12 survive termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Governing Law and Disputes</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              These Terms are governed by the laws of the State of Delaware, without regard to conflict of
              law principles. Any dispute arising under these Terms shall be resolved by binding arbitration
              under the rules of the American Arbitration Association, with proceedings conducted in English.
              You waive any right to a jury trial or class action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may modify these Terms at any time. Material changes will be communicated by email to
              registered users at least 14 days before they take effect. Continued use of the Platform
              after the effective date of changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI<br />
              Legal inquiries: <strong>legal@orchestraai.io</strong><br />
              General support: <strong>support@orchestraai.io</strong>
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-4 justify-between items-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Orchestra AI. All rights reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/terms")} className="text-xs text-muted-foreground">Terms of Use</button>
            <button onClick={() => navigate("/privacy")} className="text-xs text-primary hover:underline">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
