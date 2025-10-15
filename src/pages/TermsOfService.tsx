import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Last Updated: {new Date().toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p>By accessing and using the Glorious Global Security Intelligence Platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Service Description</h2>
              <p>Our platform provides security intelligence services including:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Real-time threat detection and monitoring</li>
                <li>Security event analysis and reporting</li>
                <li>Access control management</li>
                <li>Incident response tracking</li>
                <li>System health monitoring</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. User Responsibilities</h2>
              <p>Users agree to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Provide accurate account information</li>
                <li>Maintain the security of their credentials</li>
                <li>Use the service for lawful purposes only</li>
                <li>Not attempt to breach or test security measures</li>
                <li>Not interfere with other users&apos; access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Prohibited Activities</h2>
              <p>Users must not:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Use the service for illegal activities</li>
                <li>Transmit malicious code or malware</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass or harm other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Intellectual Property</h2>
              <p>All content, features, and functionality of the platform are owned by Glorious Global Technology and are protected by international copyright, trademark, and other intellectual property laws.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Limitation of Liability</h2>
              <p>The service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Service Modifications</h2>
              <p>We reserve the right to modify, suspend, or discontinue the service at any time without prior notice. We may also update these terms periodically.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Account Termination</h2>
              <p>We may terminate or suspend accounts that violate these terms or engage in prohibited activities. Users may also terminate their accounts at any time.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">9. Governing Law</h2>
              <p>These terms are governed by applicable international laws. Any disputes will be resolved through binding arbitration.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Contact Information</h2>
              <p>For questions about these Terms of Service, contact us at:</p>
              <p className="mt-2">Email: gloriousglobaltechbrand@gmail.com</p>
              <p>Phone: +2348062121452</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}