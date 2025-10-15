import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>

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
              <p className="mt-2">Email: privacy@gloriousglobal.tech</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}