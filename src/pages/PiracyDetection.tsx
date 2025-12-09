import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, ArrowLeft, Loader2, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RoleBadge, AnalystOnly } from "@/components/RoleBasedAccess";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const PiracyDetection = () => {
  const { isAnalyst, isAdmin } = useRoleAccess();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [websiteUrls, setWebsiteUrls] = useState("");
  const [lastScan, setLastScan] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const startPiracyScan = async () => {
    if (!productName.trim() && !brandName.trim()) {
      toast({
        title: "Error",
        description: "Please provide product or brand name",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);

    try {
      const urls = websiteUrls.split('\n').filter(url => url.trim());
      
      const { data, error } = await supabase.functions.invoke('piracy-detection', {
        body: { 
          productName, 
          brandName,
          websiteUrls: urls,
          scanDepth: 'comprehensive'
        }
      });

      if (error) throw error;

      setLastScan(data.data);

      if (data.data?.violations_detected) {
        toast({
          title: "⚠️ VIOLATIONS DETECTED",
          description: `Found ${data.data.violation_count} copyright/IP violations`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Scan Complete",
          description: "No violations detected in scanned content",
        });
      }

      // Clear form
      setProductName("");
      setBrandName("");
      setWebsiteUrls("");
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to complete piracy scan",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
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
            <div className="p-2 bg-warning/10 rounded-lg">
              <ShieldAlert className="h-6 w-6 md:h-8 md:w-8 text-warning" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Piracy & Copyright Detection</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">High-speed scanning up to 1M websites/hour</p>
            </div>
          </div>
          <RoleBadge />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {lastScan?.violations_detected && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Copyright Violations Detected</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <p><strong>Total Violations:</strong> {lastScan.violation_count}</p>
                <p><strong>Confidence Score:</strong> {((lastScan.confidence_score || 0) * 100).toFixed(0)}%</p>
                {lastScan.immediate_actions && lastScan.immediate_actions.length > 0 && (
                  <div>
                    <strong>Immediate Actions Required:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {lastScan.immediate_actions.map((action: string, idx: number) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Initiate Piracy Scan
              </CardTitle>
              <CardDescription>Scan for copyright & IP violations across millions of websites</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Enter product name to scan for"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  placeholder="Enter brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="websiteUrls">Target Websites (Optional)</Label>
                <Textarea
                  id="websiteUrls"
                  placeholder="Enter website URLs to scan (one per line)&#10;Leave empty for automated mass scan"
                  value={websiteUrls}
                  onChange={(e) => setWebsiteUrls(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
              <Button onClick={startPiracyScan} disabled={scanning} className="w-full">
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning Websites...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Start Piracy Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scan Capabilities</CardTitle>
              <CardDescription>Advanced copyright protection features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">High-Speed Scanning</p>
                    <p className="text-sm text-muted-foreground">Up to 1 million websites per hour</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Trademark Infringement</p>
                    <p className="text-sm text-muted-foreground">Detect unauthorized brand usage</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Counterfeit Detection</p>
                    <p className="text-sm text-muted-foreground">Identify fake product distribution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">License Violations</p>
                    <p className="text-sm text-muted-foreground">Track unauthorized usage patterns</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastScan && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Latest Scan Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold mt-1">
                    {lastScan.violations_detected ? '🚨 VIOLATIONS' : '✅ CLEAN'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-lg font-bold mt-1">{lastScan.violation_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold mt-1">{((lastScan.confidence_score || 0) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scan Rate</p>
                  <p className="text-lg font-bold mt-1">
                    {lastScan.scan_metrics?.scan_rate_per_hour?.toLocaleString() || '0'}/hr
                  </p>
                </div>
              </div>

              {lastScan.scan_summary && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Scan Summary:</p>
                  <p className="text-sm">{lastScan.scan_summary}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold">Violation Types Detected:</h3>
                
                {lastScan.violation_types?.copyright?.detected && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Copyright Violations</h4>
                      <Badge variant={getSeverityColor(lastScan.violation_types.copyright.severity)}>
                        {lastScan.violation_types.copyright.severity?.toUpperCase()}
                      </Badge>
                    </div>
                    {lastScan.violation_types.copyright.instances?.length > 0 && (
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {lastScan.violation_types.copyright.instances.map((instance: string, idx: number) => (
                          <li key={idx}>• {instance}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {lastScan.violation_types?.trademark?.detected && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Trademark Infringement</h4>
                      <Badge variant={getSeverityColor(lastScan.violation_types.trademark.severity)}>
                        {lastScan.violation_types.trademark.severity?.toUpperCase()}
                      </Badge>
                    </div>
                    {lastScan.violation_types.trademark.instances?.length > 0 && (
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {lastScan.violation_types.trademark.instances.map((instance: string, idx: number) => (
                          <li key={idx}>• {instance}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {lastScan.violation_types?.counterfeiting?.detected && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Counterfeit Products</h4>
                      <Badge variant={getSeverityColor(lastScan.violation_types.counterfeiting.severity)}>
                        {lastScan.violation_types.counterfeiting.severity?.toUpperCase()}
                      </Badge>
                    </div>
                    {lastScan.violation_types.counterfeiting.indicators?.length > 0 && (
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {lastScan.violation_types.counterfeiting.indicators.map((indicator: string, idx: number) => (
                          <li key={idx}>• {indicator}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {lastScan.risk_assessment && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h3 className="font-semibold mb-3">Risk Assessment:</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Brand Risk</p>
                      <Badge variant={getSeverityColor(lastScan.risk_assessment.brand_reputation_risk)}>
                        {lastScan.risk_assessment.brand_reputation_risk?.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Financial Impact</p>
                      <Badge variant={getSeverityColor(lastScan.risk_assessment.financial_impact)}>
                        {lastScan.risk_assessment.financial_impact?.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Legal Risk</p>
                      <Badge variant={getSeverityColor(lastScan.risk_assessment.legal_risk)}>
                        {lastScan.risk_assessment.legal_risk?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {lastScan.enforcement_recommendations && lastScan.enforcement_recommendations.length > 0 && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h3 className="font-semibold mb-2">Enforcement Recommendations:</h3>
                  <ul className="space-y-2">
                    {lastScan.enforcement_recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-blue-500 mt-1">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PiracyDetection;
