import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Globe, Award } from "lucide-react";
import logo from "@/assets/logo.png";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">About Us</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Glorious Global Technology" className="h-24 w-24" />
            </div>
            <CardTitle className="text-3xl">Glorious Global Technology</CardTitle>
            <CardDescription className="text-lg">Leading the Future of Security Intelligence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                At Glorious Global Technology, we are committed to providing world-class security intelligence solutions 
                that protect organizations from emerging cyber threats. Our platform combines advanced AI-powered threat 
                detection with comprehensive monitoring and response capabilities.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Shield className="h-12 w-12 text-blue-500 mb-2" />
                  <CardTitle>Advanced Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    State-of-the-art security measures and real-time threat detection to keep your systems safe.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-12 w-12 text-green-500 mb-2" />
                  <CardTitle>Expert Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our team of security experts and AI specialists work around the clock to improve our platform.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-12 w-12 text-purple-500 mb-2" />
                  <CardTitle>Global Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Trusted by organizations worldwide for comprehensive security intelligence solutions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Award className="h-12 w-12 text-orange-500 mb-2" />
                  <CardTitle>Industry Leading</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Award-winning platform recognized for innovation in cybersecurity and threat intelligence.
                  </p>
                </CardContent>
              </Card>
            </div>

            <section>
              <h2 className="text-2xl font-bold mb-4">What We Do</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>AI-powered threat detection and analysis using cutting-edge machine learning algorithms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Real-time security monitoring and incident response tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Comprehensive access control and audit logging systems</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Advanced sentiment analysis for communication security</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Compliance reporting for GDPR, HIPAA, and SOC2 standards</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>Email: gloriousglobaltechbrand@gmail.com</p>
                <p>Phone: +2348062121452</p>
                <p>Business Hours: Monday - Friday, 9:00 AM - 6:00 PM (UTC)</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}