import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileJson, Shield, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ExportRequest {
  id: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

export const GDPRDataExport = () => {
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(null);
  const [previousExports, setPreviousExports] = useState<ExportRequest[]>([]);
  const { toast } = useToast();

  const loadPreviousExports = async () => {
    const { data } = await supabase
      .from('gdpr_export_requests')
      .select('id, status, requested_at, completed_at, expires_at')
      .order('requested_at', { ascending: false })
      .limit(5);

    if (data) {
      setPreviousExports(data);
    }
  };

  const requestDataExport = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to export your data",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('gdpr-export', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setExportData(response.data.data);
      await loadPreviousExports();

      toast({
        title: "Export Complete",
        description: "Your personal data has been exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const downloadExport = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your data export file is downloading",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-success/30 text-success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-warning/30 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="cyber-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          GDPR Data Export
        </CardTitle>
        <CardDescription>
          Download a copy of all your personal data stored in our systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Action */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border rounded-lg border-primary/20 bg-primary/5">
          <div>
            <h4 className="font-medium">Request Data Export</h4>
            <p className="text-sm text-muted-foreground">
              Generate a JSON file containing all your personal data
            </p>
          </div>
          <Button 
            onClick={requestDataExport} 
            disabled={exporting}
            className="shrink-0"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </div>

        {/* Download Ready */}
        {exportData && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border rounded-lg border-success/30 bg-success/5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <h4 className="font-medium text-success">Export Ready</h4>
                <p className="text-sm text-muted-foreground">
                  Your data export is ready for download
                </p>
              </div>
            </div>
            <Button 
              onClick={downloadExport}
              variant="outline"
              className="border-success/30 hover:bg-success/10 shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        )}

        {/* Data Categories */}
        <div>
          <h4 className="text-sm font-medium mb-3">Data Categories Included</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              'Profile Information',
              'User Roles',
              'Notifications',
              'Access Logs',
              'Alert History',
              'Security Audit Logs',
              'Incidents',
              'Compliance Reports',
              'Export History',
            ].map((category) => (
              <div key={category} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-success" />
                {category}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="p-3 border rounded-lg border-warning/20 bg-warning/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Privacy Notice</p>
              <p className="text-muted-foreground">
                IP addresses older than 30 days are automatically anonymized for privacy compliance. 
                Session tokens are hashed and cannot be decrypted.
              </p>
            </div>
          </div>
        </div>

        {/* Previous Exports */}
        {previousExports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Export Requests</h4>
            <div className="space-y-2">
              {previousExports.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{format(new Date(exp.requested_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  {getStatusBadge(exp.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GDPRDataExport;