import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

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
      const { data, error } = await (supabase as any)
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
      
      const { error } = await (supabase as any).from("compliance_reports").insert({
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Compliance Reports</h1>
            <p className="text-muted-foreground">Generate and manage compliance documentation</p>
          </div>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

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
  );
}