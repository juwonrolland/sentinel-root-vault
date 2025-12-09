import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RoleBadge, AnalystOnly } from "@/components/RoleBasedAccess";
import { useRoleAccess } from "@/hooks/useRoleAccess";
interface ComplianceReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  findings: any;
  generated_by: string;
  created_at: string;
}

export default function ComplianceReports() {
  const { isAnalyst, isAdmin } = useRoleAccess();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadReports();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("compliance_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load compliance reports");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - 1);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from("compliance_reports").insert({
        report_type: reportType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        findings: {
          total_events: 0,
          critical_findings: 0,
          recommendations: []
        },
        generated_by: session?.user?.id
      });

      if (error) throw error;
      
      toast.success("Compliance report generated");
      loadReports();
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate compliance report");
    }
  };

  const exportReport = (report: ComplianceReport) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compliance-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="icon" className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Compliance Reports</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Generate GDPR, HIPAA, and SOC2 compliance documentation</p>
            </div>
          </div>
          <RoleBadge />
        </div>
      </header>
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["GDPR", "HIPAA", "SOC2"].map((type) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {type}
                </CardTitle>
                <CardDescription>Generate {type} compliance report</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => generateReport(type)} className="w-full">
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>All compliance reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.report_type}</TableCell>
                    <TableCell>
                      {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => exportReport(report)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}