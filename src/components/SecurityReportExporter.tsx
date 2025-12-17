import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  Activity,
  Calendar,
  CheckCircle2,
  Loader2,
  FileJson,
  File
} from 'lucide-react';

interface ReportSection {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export const SecurityReportExporter = () => {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'docx' | 'json' | 'csv'>('docx');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'executive_summary', label: 'Executive Summary', description: 'High-level overview of security posture', checked: true },
    { id: 'threat_analysis', label: 'Threat Analysis', description: 'Detailed breakdown of detected threats', checked: true },
    { id: 'incident_report', label: 'Incident Report', description: 'List of security incidents and resolutions', checked: true },
    { id: 'compliance_status', label: 'Compliance Status', description: 'GDPR, HIPAA, SOC2 compliance overview', checked: true },
    { id: 'network_health', label: 'Network Health', description: 'Infrastructure status and metrics', checked: true },
    { id: 'access_logs', label: 'Access Logs Summary', description: 'User access patterns and anomalies', checked: false },
    { id: 'recommendations', label: 'Recommendations', description: 'Security improvement suggestions', checked: true },
  ]);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, checked: !s.checked } : s
    ));
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const fetchReportData = async () => {
    const startDate = getDateRangeFilter().toISOString();
    const selectedSections = sections.filter(s => s.checked).map(s => s.id);

    const data: Record<string, any> = {
      generated_at: new Date().toISOString(),
      date_range: dateRange,
      sections: selectedSections,
    };

    // Fetch threats
    if (selectedSections.includes('threat_analysis') || selectedSections.includes('executive_summary')) {
      const { data: threats } = await supabase
        .from('threat_detections')
        .select('*')
        .gte('detected_at', startDate)
        .order('detected_at', { ascending: false });
      data.threats = threats || [];
    }

    // Fetch incidents
    if (selectedSections.includes('incident_report') || selectedSections.includes('executive_summary')) {
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      data.incidents = incidents || [];
    }

    // Fetch security events
    if (selectedSections.includes('threat_analysis')) {
      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .gte('detected_at', startDate)
        .order('detected_at', { ascending: false });
      data.security_events = events || [];
    }

    // Fetch compliance checks
    if (selectedSections.includes('compliance_status')) {
      const { data: compliance } = await supabase
        .from('compliance_checks')
        .select('*')
        .order('last_checked', { ascending: false });
      data.compliance = compliance || [];
    }

    // Fetch access logs
    if (selectedSections.includes('access_logs')) {
      const { data: logs } = await supabase
        .from('access_logs')
        .select('*')
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: false })
        .limit(100);
      data.access_logs = logs || [];
    }

    return data;
  };

  const generateDocxReport = async (reportData: Record<string, any>) => {
    const children: any[] = [];
    
    // Title
    children.push(
      new Paragraph({
        text: "SECURITY INTELLIGENCE REPORT",
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // Report metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 20, color: "666666" }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Date Range: ${dateRange}`, size: 20, color: "666666" }),
        ],
        spacing: { after: 400 },
      })
    );

    // Executive Summary
    if (sections.find(s => s.id === 'executive_summary')?.checked) {
      children.push(
        new Paragraph({
          text: "Executive Summary",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Total Threats Detected: `, bold: true }),
            new TextRun({ text: `${reportData.threats?.length || 0}` }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Active Incidents: `, bold: true }),
            new TextRun({ text: `${reportData.incidents?.filter((i: any) => i.status !== 'closed')?.length || 0}` }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Critical Threats: `, bold: true, color: "FF0000" }),
            new TextRun({ text: `${reportData.threats?.filter((t: any) => t.severity === 'critical')?.length || 0}` }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Threat Analysis
    if (sections.find(s => s.id === 'threat_analysis')?.checked && reportData.threats?.length > 0) {
      children.push(
        new Paragraph({
          text: "Threat Analysis",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Detected", bold: true })] })] }),
          ],
        }),
        ...reportData.threats.slice(0, 20).map((threat: any) => 
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: threat.threat_type || 'Unknown' })] }),
              new TableCell({ children: [new Paragraph({ text: threat.severity?.toUpperCase() || 'N/A' })] }),
              new TableCell({ children: [new Paragraph({ text: threat.status || 'N/A' })] }),
              new TableCell({ children: [new Paragraph({ text: new Date(threat.detected_at).toLocaleDateString() })] }),
            ],
          })
        ),
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    // Incident Report
    if (sections.find(s => s.id === 'incident_report')?.checked && reportData.incidents?.length > 0) {
      children.push(
        new Paragraph({
          text: "Incident Report",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      reportData.incidents.slice(0, 10).forEach((incident: any) => {
        children.push(
          new Paragraph({
            text: incident.title,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Severity: ${incident.severity?.toUpperCase()} | Status: ${incident.status}`, italics: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: incident.description || 'No description provided',
            spacing: { after: 200 },
          })
        );
      });
    }

    // Recommendations
    if (sections.find(s => s.id === 'recommendations')?.checked) {
      children.push(
        new Paragraph({
          text: "Security Recommendations",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "• Implement additional endpoint protection measures",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "• Review and update access control policies",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "• Conduct regular security awareness training",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "• Enable multi-factor authentication for all accounts",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "• Schedule regular penetration testing",
          spacing: { after: 100 },
        })
      );
    }

    const doc = new Document({
      sections: [{ children }],
    });

    return await Packer.toBlob(doc);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const reportData = await fetchReportData();

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'docx':
          blob = await generateDocxReport(reportData);
          filename = `security-report-${new Date().toISOString().split('T')[0]}.docx`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
          filename = `security-report-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'csv':
          // Generate CSV from threats
          const csvContent = [
            'Type,Severity,Status,Detected At,Details',
            ...(reportData.threats || []).map((t: any) => 
              `"${t.threat_type}","${t.severity}","${t.status}","${t.detected_at}","${t.details?.replace(/"/g, '""') || ''}"`
            )
          ].join('\n');
          blob = new Blob([csvContent], { type: 'text/csv' });
          filename = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error('Unsupported format');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Security Report Exporter
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Generate comprehensive security reports in multiple formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Options Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Export Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">
                  <span className="flex items-center gap-2">
                    <File className="h-4 w-4" /> Word Document (.docx)
                  </span>
                </SelectItem>
                <SelectItem value="json">
                  <span className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" /> JSON Data
                  </span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> CSV Spreadsheet
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Date Range</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section Selection */}
        <div className="space-y-3">
          <Label className="text-xs sm:text-sm">Report Sections</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                  section.checked 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-secondary/30 border-border hover:border-primary/20'
                }`}
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-start gap-2">
                  <Checkbox 
                    checked={section.checked} 
                    onCheckedChange={() => toggleSection(section.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm">{section.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={generateReport} 
          disabled={loading || !sections.some(s => s.checked)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
