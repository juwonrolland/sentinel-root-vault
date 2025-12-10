import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AdminOnly } from "@/components/RoleBasedAccess";
import { 
  Download, 
  FileText, 
  Shield, 
  Calendar, 
  Database,
  AlertTriangle,
  Activity,
  Users,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Lock
} from "lucide-react";
import { format } from "date-fns";

type ExportFormat = 'json' | 'csv';
type AuditCategory = 'security_audit_log' | 'access_logs' | 'security_events' | 'incidents' | 'threat_detections';

interface ExportConfig {
  category: AuditCategory;
  format: ExportFormat;
  startDate: string;
  endDate: string;
  includeMetadata: boolean;
}

const CATEGORY_CONFIG: Record<AuditCategory, { label: string; icon: React.ReactNode; description: string }> = {
  security_audit_log: {
    label: 'Security Audit Log',
    icon: <Shield className="h-4 w-4" />,
    description: 'Complete security audit trail with user actions and system events',
  },
  access_logs: {
    label: 'Access Logs',
    icon: <Users className="h-4 w-4" />,
    description: 'User access records including login attempts and resource access',
  },
  security_events: {
    label: 'Security Events',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Security incidents and anomalies detected by the system',
  },
  incidents: {
    label: 'Incidents',
    icon: <Activity className="h-4 w-4" />,
    description: 'All incident reports with status and resolution details',
  },
  threat_detections: {
    label: 'Threat Detections',
    icon: <Database className="h-4 w-4" />,
    description: 'Detected threats with severity, indicators, and response actions',
  },
};

export const AuditExport = () => {
  const [config, setConfig] = useState<ExportConfig>({
    category: 'security_audit_log',
    format: 'json',
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    includeMetadata: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    category: string;
    format: string;
    timestamp: string;
    records: number;
  }>>([]);
  const { toast } = useToast();

  const exportData = async () => {
    setExporting(true);
    try {
      let query = supabase.from(config.category).select('*');

      // Add date filters based on category
      const dateColumn = config.category === 'security_audit_log' ? 'created_at' :
                        config.category === 'access_logs' ? 'timestamp' :
                        config.category === 'security_events' ? 'detected_at' :
                        config.category === 'incidents' ? 'created_at' :
                        'detected_at';

      query = query
        .gte(dateColumn, config.startDate)
        .lte(dateColumn, config.endDate + 'T23:59:59');

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No records found for the selected criteria",
          variant: "destructive",
        });
        setExporting(false);
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (config.format === 'json') {
        const exportData = config.includeMetadata ? {
          exportInfo: {
            category: config.category,
            exportDate: new Date().toISOString(),
            dateRange: { start: config.startDate, end: config.endDate },
            totalRecords: data.length,
            platform: 'Glorious Global Security Intelligence Platform',
          },
          data,
        } : data;
        
        content = JSON.stringify(exportData, null, 2);
        filename = `audit_${config.category}_${config.startDate}_${config.endDate}.json`;
        mimeType = 'application/json';
      } else {
        // CSV export
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              if (typeof value === 'object') {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              }
              return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value ?? '';
            }).join(',')
          )
        ];
        content = csvRows.join('\n');
        filename = `audit_${config.category}_${config.startDate}_${config.endDate}.csv`;
        mimeType = 'text/csv';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Add to export history
      setExportHistory(prev => [{
        category: CATEGORY_CONFIG[config.category].label,
        format: config.format.toUpperCase(),
        timestamp: new Date().toISOString(),
        records: data.length,
      }, ...prev.slice(0, 9)]);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export audit data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminOnly
      fallback={
        <Card className="cyber-card border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Admin Access Required</h3>
            <p className="text-sm text-muted-foreground text-center">
              Only administrators can export audit data.
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Export Configuration */}
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Audit Data Export
            </CardTitle>
            <CardDescription>
              Export security audit logs and compliance data for reporting and analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Data Category</Label>
              <Select
                value={config.category}
                onValueChange={(v) => setConfig(prev => ({ ...prev, category: v as AuditCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {CATEGORY_CONFIG[config.category].description}
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-4">
                <Button
                  variant={config.format === 'json' ? 'default' : 'outline'}
                  onClick={() => setConfig(prev => ({ ...prev, format: 'json' }))}
                  className="flex-1"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant={config.format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setConfig(prev => ({ ...prev, format: 'csv' }))}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMetadata"
                checked={config.includeMetadata}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, includeMetadata: checked as boolean }))
                }
              />
              <Label htmlFor="includeMetadata" className="text-sm cursor-pointer">
                Include export metadata (timestamp, record count, platform info)
              </Label>
            </div>

            {/* Export Button */}
            <Button 
              onClick={exportData} 
              disabled={exporting}
              className="w-full"
              size="lg"
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {CATEGORY_CONFIG[config.category].label}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Recent Exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{item.format}</Badge>
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.records} records</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminOnly>
  );
};

export default AuditExport;
