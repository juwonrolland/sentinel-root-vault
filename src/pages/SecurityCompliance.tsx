import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, CheckCircle2, AlertTriangle, XCircle, FileText, Lock, Database, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/RoleBasedAccess";

interface ComplianceCheck {
  id: string;
  check_type: string;
  check_name: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  last_checked: string;
  findings: any[];
  recommendations: any[];
}

interface SecurityAuditLog {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  created_at: string;
  user_id: string | null;
  success: boolean;
}

interface ActiveSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  created_at: string;
  last_activity: string;
  is_valid: boolean;
}

const SecurityCompliance = () => {
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadComplianceChecks(),
      loadAuditLogs(),
      loadActiveSessions()
    ]);
    setLoading(false);
  };

  const loadComplianceChecks = async () => {
    const { data, error } = await supabase
      .from("compliance_checks")
      .select("*")
      .order("last_checked", { ascending: false });

    if (error) {
      console.error("Error loading compliance checks:", error);
    } else {
      setComplianceChecks((data || []) as ComplianceCheck[]);
    }
  };

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from("security_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading audit logs:", error);
    } else {
      setAuditLogs(data || []);
    }
  };

  const loadActiveSessions = async () => {
    const { data, error } = await supabase
      .from("active_sessions")
      .select("*")
      .eq("is_valid", true)
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
    } else {
      setActiveSessions((data || []) as ActiveSession[]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      compliant: { variant: "default", icon: CheckCircle2 },
      partial: { variant: "secondary", icon: AlertTriangle },
      non_compliant: { variant: "destructive", icon: XCircle },
      not_applicable: { variant: "outline", icon: FileText }
    };

    const config = variants[status] || variants.not_applicable;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      info: "default",
      warning: "secondary",
      critical: "destructive"
    };

    return (
      <Badge variant={variants[severity] || "default"}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const complianceStats = {
    total: complianceChecks.length,
    compliant: complianceChecks.filter(c => c.status === 'compliant').length,
    partial: complianceChecks.filter(c => c.status === 'partial').length,
    nonCompliant: complianceChecks.filter(c => c.status === 'non_compliant').length
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Security & Compliance</h1>
            </div>
          </div>
          <RoleBadge />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Checks</CardDescription>
              <CardTitle className="text-3xl">{complianceStats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Compliant
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">{complianceStats.compliant}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Partial
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{complianceStats.partial}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                Non-Compliant
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{complianceStats.nonCompliant}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Security Features Implemented */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Implemented Security Features
            </CardTitle>
            <CardDescription>Enterprise-grade security measures active in your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">HTTPS/TLS Encryption</h4>
                  <p className="text-sm text-muted-foreground">All data transmitted over secure HTTPS with TLS 1.3</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Data Encryption at Rest</h4>
                  <p className="text-sm text-muted-foreground">AES-256 encryption for stored data</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Role-Based Access Control</h4>
                  <p className="text-sm text-muted-foreground">Granular permissions via user roles</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Row-Level Security</h4>
                  <p className="text-sm text-muted-foreground">Database-level access policies</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">API Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">Protection against abuse and DDoS</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Comprehensive Audit Logging</h4>
                  <p className="text-sm text-muted-foreground">All security events tracked</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Session Management</h4>
                  <p className="text-sm text-muted-foreground">Secure session tracking and validation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Input Validation</h4>
                  <p className="text-sm text-muted-foreground">Protection against injection attacks</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="compliance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Framework Status</CardTitle>
                <CardDescription>Adherence to global security standards</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceChecks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Framework</TableHead>
                        <TableHead>Check Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Checked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell>
                            <Badge variant="outline">{check.check_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{check.check_name}</TableCell>
                          <TableCell>{getStatusBadge(check.status)}</TableCell>
                          <TableCell>{new Date(check.last_checked).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No compliance checks recorded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Audit Trail</CardTitle>
                <CardDescription>Comprehensive logging of all security events</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.event_type}</TableCell>
                          <TableCell>{log.event_category}</TableCell>
                          <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                          <TableCell>
                            <Badge variant={log.success ? "default" : "destructive"}>
                              {log.success ? "Success" : "Failed"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No audit logs available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active User Sessions</CardTitle>
                <CardDescription>Real-time session monitoring and management</CardDescription>
              </CardHeader>
              <CardContent>
                {activeSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-mono">{session.ip_address || 'N/A'}</TableCell>
                          <TableCell>{new Date(session.created_at).toLocaleString()}</TableCell>
                          <TableCell>{new Date(session.last_activity).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={session.is_valid ? "default" : "destructive"}>
                              {session.is_valid ? "Active" : "Expired"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No active sessions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compliance Documentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Compliance & Security Standards
            </CardTitle>
            <CardDescription>Framework adherence and best practices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Standards Compliance:</h4>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span><strong>OWASP ASVS</strong>: Application Security Verification Standard implemented</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span><strong>NIST Cybersecurity Framework</strong>: Core security functions applied</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span><strong>GDPR Ready</strong>: Data protection and privacy controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span><strong>ISO 27001 Aligned</strong>: Information security management practices</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold">Organizational Requirements:</h4>
              <ul className="space-y-2 pl-4 text-sm text-muted-foreground">
                <li>• Regular security penetration testing by certified professionals</li>
                <li>• Security awareness training for all personnel</li>
                <li>• Incident response plan documentation and drills</li>
                <li>• Third-party security audits and certifications</li>
                <li>• Business continuity and disaster recovery planning</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SecurityCompliance;
