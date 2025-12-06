import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Loader2, 
  Calendar,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileWarning
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ReportData {
  id?: string;
  title: string;
  type: string;
  data: {
    summary?: {
      totalIncidents: number;
      totalEvents: number;
      totalThreats: number;
      totalAuditLogs: number;
    };
    breakdown?: {
      incidentsBySeverity: Record<string, number>;
      incidentsByStatus: Record<string, number>;
      eventsByType: Record<string, number>;
      threatsByType: Record<string, number>;
    };
    incident?: {
      id: string;
      title: string;
      severity: string;
      status: string;
      description: string;
      created_at: string;
    };
    period?: {
      start: string;
      end: string;
    };
  };
  aiSummary: string;
  generatedAt: string;
}

export const IncidentReportGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('executive_summary');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const { toast } = useToast();

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-incident-report', {
        body: {
          reportType,
          dateRange: {
            start: new Date(dateRange.start).toISOString(),
            end: new Date(dateRange.end).toISOString()
          }
        }
      });

      if (error) throw error;

      setGeneratedReport(data.report);
      toast({
        title: "Report Generated",
        description: "Your security report is ready for review",
      });
    } catch (error) {
      console.error('Report generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;

    const reportContent = `
# ${generatedReport.title}
Generated: ${new Date(generatedReport.generatedAt).toLocaleString()}
Report Type: ${generatedReport.type}

${generatedReport.aiSummary}

---
## Raw Data Summary
${JSON.stringify(generatedReport.data, null, 2)}
`;

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="cyber-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Incident Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="generate">Generate Report</TabsTrigger>
            <TabsTrigger value="view" disabled={!generatedReport}>View Report</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive_summary">Executive Summary</SelectItem>
                    <SelectItem value="technical_detail">Technical Detail</SelectItem>
                    <SelectItem value="compliance_audit">Compliance Audit</SelectItem>
                    <SelectItem value="threat_intelligence">Threat Intelligence</SelectItem>
                    <SelectItem value="incident_response">Incident Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={generateReport} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Security Report
                </>
              )}
            </Button>

            {/* Quick Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-lg font-bold">--</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <FileWarning className="h-4 w-4 text-warning mb-1" />
                <p className="text-xs text-muted-foreground">High</p>
                <p className="text-lg font-bold">--</p>
              </div>
              <div className="p-3 rounded-lg bg-info/10 border border-info/30">
                <Shield className="h-4 w-4 text-info mb-1" />
                <p className="text-xs text-muted-foreground">Medium</p>
                <p className="text-lg font-bold">--</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle className="h-4 w-4 text-success mb-1" />
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-lg font-bold">--</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-4">
            {generatedReport && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{generatedReport.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(generatedReport.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button onClick={downloadReport} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                {/* Summary Stats */}
                {generatedReport.data.summary && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-bold">{generatedReport.data.summary.totalIncidents}</p>
                      <p className="text-xs text-muted-foreground">Incidents</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-bold">{generatedReport.data.summary.totalEvents}</p>
                      <p className="text-xs text-muted-foreground">Events</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-bold">{generatedReport.data.summary.totalThreats}</p>
                      <p className="text-xs text-muted-foreground">Threats</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-bold">{generatedReport.data.summary.totalAuditLogs}</p>
                      <p className="text-xs text-muted-foreground">Audit Logs</p>
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                <ScrollArea className="h-[400px] rounded-lg border border-border/50 p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{generatedReport.aiSummary}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
