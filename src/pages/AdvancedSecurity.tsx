import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { RoleBadge } from "@/components/RoleBasedAccess";
import { AdvancedSecurityDashboard } from "@/components/AdvancedSecurityDashboard";
import { TwoFactorAuth } from "@/components/TwoFactorAuth";
import { ThreatCorrelationEngine } from "@/components/ThreatCorrelationEngine";

const AdvancedSecurity = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Advanced Security Center</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Enterprise-grade security monitoring and threat intelligence
              </p>
            </div>
          </div>
          <RoleBadge />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* 2FA Section */}
        {user && (
          <TwoFactorAuth userId={user.id} userEmail={user.email || ''} />
        )}

        {/* Advanced Security Dashboard */}
        <AdvancedSecurityDashboard />

        {/* Threat Correlation Engine */}
        <ThreatCorrelationEngine />
      </main>
    </div>
  );
};

export default AdvancedSecurity;
