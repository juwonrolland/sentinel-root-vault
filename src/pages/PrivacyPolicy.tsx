import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "@/assets/logo.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2 bg-primary/10 rounded-lg">
            <img src={logo} alt="Glorious Global Logo" className="h-8 w-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Privacy Policy
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">

        <Card>
          <CardHeader>
            <CardTitle>Last Updated: {new Date().toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
              <p>We collect information that you provide directly to us when using our Security Intelligence Platform, including:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Account information (email, name)</li>
                <li>Security event data and logs</li>
                <li>System health metrics</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
              <p>We use the collected information to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Provide and maintain our security services</li>
                <li>Detect and prevent security threats</li>
                <li>Improve our platform and user experience</li>
                <li>Communicate important updates and alerts</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Security</h2>
              <p>We implement industry-standard security measures to protect your data, including encryption, access controls, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Third-Party Services</h2>
              <p>Our platform may use third-party services for analytics and advertising. These services may collect information as described in their respective privacy policies:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Google AdSense for advertising</li>
                <li>Analytics providers for usage tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Cookies and Tracking</h2>
              <p>We use cookies and similar tracking technologies to improve user experience and deliver relevant advertisements. You can control cookie settings through your browser preferences.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Access your personal data</li>
                <li>Request data correction or deletion</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Children&apos;s Privacy</h2>
              <p>Our service is not intended for users under 18 years of age. We do not knowingly collect information from children.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. We will notify users of significant changes via email or platform notifications.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">9. Contact Us</h2>
              <p>For privacy-related questions or concerns, please contact us at:</p>
              <p className="mt-2">Email: gloriousglobaltechbrand@gmail.com</p>
              <p>Phone: +2348062121452</p>
            </section>
          </CardContent>
        </Card>
        </div>
      </main>

      <footer className="border-t bg-card/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Glorious Global</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security intelligence platform trusted by thousands worldwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
                <li><Link to="/security-compliance" className="text-muted-foreground hover:text-primary">Security & Compliance</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Glorious Global Technology. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}