import Link from "next/link"
import { Building2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Terms of Service",
  description: "ManageKar Terms of Service - Rules and guidelines for using our platform.",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              ManageKar
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 28, 2024</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to ManageKar! By accessing or using our website at managekar.com and our
              services, you agree to be bound by these Terms of Service (&quot;Terms&quot;). ManageKar
              (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides a platform for business management solutions,
              including but not limited to PG (Paying Guest) management software.
            </p>
            <p className="text-muted-foreground">
              If you do not agree to these Terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              ManageKar provides cloud-based management software solutions for Indian businesses.
              Our current offerings include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>PG Manager - For managing Paying Guest accommodations and hostels</li>
              <li>Property and room management</li>
              <li>Tenant lifecycle management</li>
              <li>Billing and payment tracking</li>
              <li>Meter reading and utility management</li>
              <li>Complaint and notice management</li>
              <li>Reports and analytics</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to modify, suspend, or discontinue any part of our services at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground mb-4">To use our services, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Scrape, copy, or redistribute our content without permission</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the service to send spam or unsolicited communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
            <p className="text-muted-foreground mb-4">
              You retain ownership of all data and content you upload to ManageKar (&quot;User Content&quot;).
              By using our service, you grant us a limited license to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Store and process your data to provide the service</li>
              <li>Create backups for data protection</li>
              <li>Display your content to authorized users of your account</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You are responsible for ensuring you have the right to upload any content and that
              it does not violate any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Pricing and Payments</h2>
            <p className="text-muted-foreground mb-4">
              ManageKar is currently offered as a <strong>free service</strong>. We reserve the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Introduce paid features or premium tiers in the future</li>
              <li>Modify pricing with reasonable notice to users</li>
              <li>Offer promotional pricing or discounts</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              If we introduce paid services, we will provide clear pricing information and obtain
              your consent before charging.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The ManageKar name, logo, website design, and software are owned by us and protected
              by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Copy, modify, or distribute our software without permission</li>
              <li>Use our trademarks without written consent</li>
              <li>Reverse engineer or decompile our software</li>
              <li>Remove any proprietary notices from our materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Privacy</h2>
            <p className="text-muted-foreground">
              Your privacy is important to us. Please review our{" "}
              <Link href="/privacy" className="text-teal-600 hover:underline">
                Privacy Policy
              </Link>{" "}
              to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground mb-4">
              ManageKar is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind,
              either express or implied, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Merchantability or fitness for a particular purpose</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Accuracy or reliability of any information</li>
              <li>Security or freedom from viruses</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, ManageKar and its owners, employees, and
              affiliates shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages, including but not limited to loss of profits, data, or business
              opportunities, arising from your use of our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless ManageKar and its owners from any claims,
              damages, losses, or expenses (including legal fees) arising from your use of the
              service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-muted-foreground mb-4">
              You may terminate your account at any time by contacting us. We may terminate or
              suspend your account if you:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Fail to pay any applicable fees (if introduced)</li>
              <li>Have an inactive account for an extended period</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Upon termination, you may request export of your data within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of India.
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction
              of the courts in India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify you of significant changes
              by posting a notice on our website or sending an email. Continued use of the service
              after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> legal@managekar.com</li>
              <li><strong>Website:</strong> https://managekar.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ManageKar. Made with ❤️ in India.</p>
        </div>
      </footer>
    </div>
  )
}
