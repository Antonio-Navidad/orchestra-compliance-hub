import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Who We Are</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI ("Orchestra," "we," "our," or "us") provides a U.S. customs compliance pre-filing
              audit platform at <strong>orchestra-compliance-hub.vercel.app</strong>. This Privacy Policy
              explains how we collect, use, disclose, and safeguard information when you use our platform.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For questions about this policy, contact us at: <strong>privacy@orchestraai.io</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Account Information</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  When you create an account, we collect your full name, email address, and company name.
                  This is used solely to authenticate you and personalize your workspace.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Shipment and Document Data</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  When you upload documents (commercial invoices, bills of lading, packing lists, and similar
                  customs documents), our AI systems extract structured data fields for compliance analysis.
                  Uploaded file content is processed by Anthropic's Claude API and is subject to Anthropic's
                  privacy practices. We store extracted data fields and cross-reference results in our database.
                  We do not store raw document files permanently after extraction is complete.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Usage and Technical Data</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  We collect standard server logs including IP addresses, browser type, pages visited,
                  and timestamps. This data is used for security monitoring, rate limiting, and platform
                  reliability. We do not sell or share this data with advertising networks.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Billing Information</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                  Payments are processed by Stripe, Inc. Orchestra AI does not store full credit card
                  numbers or payment card data. Stripe's privacy policy governs payment data handling.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>To provide the compliance audit service, including AI-powered document cross-referencing</li>
              <li>To authenticate you and manage your account and subscription</li>
              <li>To process billing and manage your subscription plan via Stripe</li>
              <li>To detect and prevent fraud, abuse, and unauthorized access</li>
              <li>To send transactional emails (account verification, password reset, billing receipts)</li>
              <li>To improve platform accuracy and compliance rule coverage</li>
              <li>To comply with applicable law and respond to lawful government requests</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We do not sell, rent, or trade your personal information or shipment data to third parties
              for marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Third-Party Services</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI uses the following third-party services that may process your data:
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-xs">Service</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs">Purpose</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Supabase", purpose: "Database, authentication, storage", url: "supabase.com/privacy" },
                    { name: "Anthropic (Claude API)", purpose: "AI document extraction and analysis", url: "anthropic.com/privacy" },
                    { name: "Stripe", purpose: "Payment processing", url: "stripe.com/privacy" },
                    { name: "Vercel", purpose: "Application hosting and CDN", url: "vercel.com/legal/privacy-policy" },
                  ].map(row => (
                    <tr key={row.name}>
                      <td className="px-4 py-2 font-medium text-xs">{row.name}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{row.purpose}</td>
                      <td className="px-4 py-2 text-xs"><a href={`https://${row.url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{row.url}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Data Retention</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We retain your account information and shipment records for as long as your account is active,
              or as necessary to provide the service. If you close your account, we will delete or anonymize
              your personal data within 90 days, unless retention is required by law. Extracted document
              data may be retained in anonymized form for compliance rule improvement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Data Security</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We implement industry-standard security measures including TLS encryption in transit, encrypted
              storage at rest via Supabase, Row Level Security (RLS) policies ensuring users can only access
              their own data, and IP-based rate limiting on all API endpoints. Despite these measures, no
              internet transmission is 100% secure. We encourage you not to upload documents containing
              personally identifiable information beyond what is necessary for customs compliance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Your Rights (CCPA / California Residents)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with
              the following rights:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong>Right to Know:</strong> You may request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
              <li><strong>Right to Delete:</strong> You may request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to Opt-Out:</strong> We do not sell personal information. There is nothing to opt out of regarding sales.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To exercise these rights, email <strong>privacy@orchestraai.io</strong> with "Privacy Request" in the subject line.
              We will respond within 45 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Cookies</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI uses session cookies and browser localStorage solely to maintain your authentication
              session. We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
              You can disable cookies in your browser settings, but this will prevent you from logging in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Children's Privacy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI is a business-to-business platform. We do not knowingly collect personal information
              from anyone under 18 years of age. If you believe a minor has submitted information to us,
              contact us immediately at privacy@orchestraai.io.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify registered users via email
              at least 14 days before material changes take effect. Continued use of the platform after the
              effective date constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orchestra AI<br />
              Email: <strong>privacy@orchestraai.io</strong><br />
              For data deletion requests, account inquiries, or privacy concerns, please email us directly.
              We aim to respond within 5 business days.
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-4 justify-between items-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Orchestra AI. All rights reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/terms")} className="text-xs text-primary hover:underline">Terms of Use</button>
            <button onClick={() => navigate("/privacy")} className="text-xs text-muted-foreground">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
