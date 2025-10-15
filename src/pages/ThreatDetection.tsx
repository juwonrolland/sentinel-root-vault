import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ThreatDetection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threats, setThreats] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [logData, setLogData] = useState("");

  useEffect(() => {
    checkAuth();
    loadThreats();

    const channel = supabase
      .channel('threats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threat_detections'
        },
        () => loadThreats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const loadThreats = async () => {
    const { data } = await supabase
      .from('threat_detections')
      .select('*')
      .order('detected_at', { ascending: false });
    
    if (data) setThreats(data);
  };

  const analyzeThreat = async () => {
    if (!logData.trim()) {
      toast({
        title: "Error",
        description: "Please provide log data to analyze",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: { logData }
      });

      if (error) throw error;

      toast({
        title: "Analysis Complete",
        description: data.message || "Threat analysis completed successfully",
      });

      setLogData("");
      loadThreats();
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze threat",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <AlertTriangle className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Threat Detection</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>Analyze logs and data for potential threats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logdata">Log Data / System Information</Label>
                <Textarea
                  id="logdata"
                  placeholder="Paste system logs, network traffic data, or suspicious activity details..."
                  value={logData}
                  onChange={(e) => setLogData(e.target.value)}
                  rows={8}
                  className="mt-2"
                />
              </div>
              <Button onClick={analyzeThreat} disabled={analyzing} className="w-full">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze for Threats"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detection Statistics</CardTitle>
              <CardDescription>Overview of detected threats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Detections</span>
                  <span className="text-2xl font-bold">{threats.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Critical</span>
                  <span className="text-2xl font-bold text-red-500">
                    {threats.filter(t => t.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">High</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {threats.filter(t => t.severity === 'high').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active</span>
                  <span className="text-2xl font-bold text-yellow-500">
                    {threats.filter(t => t.status === 'active').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detected Threats</CardTitle>
            <CardDescription>Recent threat detections and analysis results</CardDescription>
          </CardHeader>
          <CardContent>
            {threats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No threats detected
              </div>
            ) : (
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div key={threat.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{threat.threat_type}</div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(threat.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        threat.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                        threat.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                        threat.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {threat.severity.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{threat.details}</p>
                    <div className="text-xs text-muted-foreground">
                      Detected: {new Date(threat.detected_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ThreatDetection;