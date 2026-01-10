import { ProtectedPage } from "@/components/ProtectedPage";
import { EnhancedAuthSecurity } from "@/components/EnhancedAuthSecurity";
import { GDPRDataExport } from "@/components/GDPRDataExport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Shield,
  Bell,
  Eye,
  Lock,
  Database,
  Network,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Save,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GlobalSecuritySettings {
  autoThreatResponse: boolean;
  realTimeAlerts: boolean;
  networkMonitoring: boolean;
  auditLogging: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  ipWhitelisting: boolean;
  rateLimiting: boolean;
  intrusionDetection: boolean;
  malwareScanning: boolean;
}

const SecuritySettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GlobalSecuritySettings>(() => {
    const saved = localStorage.getItem("global-security-settings");
    return saved
      ? JSON.parse(saved)
      : {
          autoThreatResponse: true,
          realTimeAlerts: true,
          networkMonitoring: true,
          auditLogging: true,
          encryptionAtRest: true,
          encryptionInTransit: true,
          ipWhitelisting: false,
          rateLimiting: true,
          intrusionDetection: true,
          malwareScanning: true,
        };
  });

  useEffect(() => {
    localStorage.setItem("global-security-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof GlobalSecuritySettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings({
      autoThreatResponse: true,
      realTimeAlerts: true,
      networkMonitoring: true,
      auditLogging: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
      ipWhitelisting: false,
      rateLimiting: true,
      intrusionDetection: true,
      malwareScanning: true,
    });
    toast({
      title: "Settings Reset",
      description: "Security settings have been restored to defaults",
    });
  };

  const saveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your security settings have been saved successfully",
    });
  };

  const securityOptions = [
    {
      key: "autoThreatResponse" as keyof GlobalSecuritySettings,
      label: "Automated Threat Response",
      description: "Automatically respond to detected threats",
      icon: <Shield className="h-4 w-4 text-primary" />,
      critical: true,
    },
    {
      key: "realTimeAlerts" as keyof GlobalSecuritySettings,
      label: "Real-Time Alerts",
      description: "Receive instant notifications for security events",
      icon: <Bell className="h-4 w-4 text-warning" />,
      critical: true,
    },
    {
      key: "networkMonitoring" as keyof GlobalSecuritySettings,
      label: "Network Monitoring",
      description: "Continuous monitoring of network traffic",
      icon: <Network className="h-4 w-4 text-info" />,
      critical: true,
    },
    {
      key: "auditLogging" as keyof GlobalSecuritySettings,
      label: "Audit Logging",
      description: "Log all security-related activities",
      icon: <Database className="h-4 w-4 text-muted-foreground" />,
      critical: false,
    },
    {
      key: "encryptionAtRest" as keyof GlobalSecuritySettings,
      label: "Encryption at Rest",
      description: "Encrypt stored data",
      icon: <Lock className="h-4 w-4 text-success" />,
      critical: true,
    },
    {
      key: "encryptionInTransit" as keyof GlobalSecuritySettings,
      label: "Encryption in Transit",
      description: "Encrypt data during transmission",
      icon: <Lock className="h-4 w-4 text-success" />,
      critical: true,
    },
    {
      key: "ipWhitelisting" as keyof GlobalSecuritySettings,
      label: "IP Whitelisting",
      description: "Only allow access from approved IPs",
      icon: <Eye className="h-4 w-4 text-muted-foreground" />,
      critical: false,
    },
    {
      key: "rateLimiting" as keyof GlobalSecuritySettings,
      label: "Rate Limiting",
      description: "Limit request frequency to prevent abuse",
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
      critical: false,
    },
    {
      key: "intrusionDetection" as keyof GlobalSecuritySettings,
      label: "Intrusion Detection",
      description: "Detect unauthorized access attempts",
      icon: <Shield className="h-4 w-4 text-destructive" />,
      critical: true,
    },
    {
      key: "malwareScanning" as keyof GlobalSecuritySettings,
      label: "Malware Scanning",
      description: "Scan files and data for malware",
      icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
      critical: true,
    },
  ];

  const enabledCount = Object.values(settings).filter(Boolean).length;
  const totalCount = Object.keys(settings).length;

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/security-dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Security Settings
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Configure platform-wide security options
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 border-primary/30">
                {enabledCount}/{totalCount} Active
              </Badge>
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={saveSettings}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Global Security Options */}
          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Global Security Options
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Platform-wide security configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {securityOptions.map((option) => (
                  <div
                    key={option.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      settings[option.key]
                        ? "bg-success/5 border-success/30"
                        : "bg-secondary/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{option.label}</p>
                          {option.critical && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 bg-destructive/10 border-destructive/30 text-destructive">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings[option.key]}
                      onCheckedChange={(v) => updateSetting(option.key, v)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Enhanced Auth Security */}
          <EnhancedAuthSecurity />

          <Separator />

          {/* GDPR Data Export */}
          <GDPRDataExport />
        </div>
      </div>
    </ProtectedPage>
  );
};

export default SecuritySettings;
