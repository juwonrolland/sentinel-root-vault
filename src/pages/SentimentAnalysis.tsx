import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, ArrowLeft, Loader2, AlertCircle, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SentimentAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [content, setContent] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadAnalyses();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const loadAnalyses = async () => {
    const { data } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(20);
    
    if (data) setAnalyses(data);
  };

  const analyzeSentiment = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please provide text to analyze",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
        body: { content, analysisType: 'comprehensive' }
      });

      if (error) throw error;

      setLastAnalysis(data.data);

      // Show comprehensive security warnings
      if (data.data?.threat_level === 'critical' || data.data?.threat_level === 'high') {
        toast({
          title: "⚠️ CRITICAL SECURITY ALERT",
          description: `${data.data.red_flags?.join(' | ') || 'High-risk content detected'}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: data.message || "Forensic NLP analysis completed",
        });
      }

      setContent("");
      loadAnalyses();
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze sentiment",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'negative':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'suspicious':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'malicious':
        return 'bg-red-700/10 text-red-700 border-red-700/20';
      case 'neutral':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getThreatBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return 'bg-red-700/20 text-red-700 border-red-700';
      case 'high':
        return 'bg-orange-600/20 text-orange-600 border-orange-600';
      case 'medium':
        return 'bg-yellow-600/20 text-yellow-600 border-yellow-600';
      case 'low':
        return 'bg-blue-600/20 text-blue-600 border-blue-600';
      default:
        return 'bg-green-600/20 text-green-600 border-green-600';
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
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Forensic NLP Security Analysis</h1>
            <p className="text-sm text-muted-foreground">Comprehensive contextual threat detection & sentiment analysis</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {lastAnalysis && (lastAnalysis.threat_level === 'critical' || lastAnalysis.threat_level === 'high') && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Alert Detected</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <p><strong>Threat Level:</strong> {lastAnalysis.threat_level?.toUpperCase()}</p>
                {lastAnalysis.red_flags && lastAnalysis.red_flags.length > 0 && (
                  <div>
                    <strong>Red Flags:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {lastAnalysis.red_flags.map((flag: string, idx: number) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lastAnalysis.security_recommendations && lastAnalysis.security_recommendations.length > 0 && (
                  <div>
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {lastAnalysis.security_recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
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
                <MessageSquare className="h-5 w-5" />
                Forensic Analysis Input
              </CardTitle>
              <CardDescription>AI-powered comprehensive security & sentiment analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content">Text Content for Analysis</Label>
                <Textarea
                  id="content"
                  placeholder="Enter text, communications, documents, or any content for comprehensive forensic NLP analysis, sentiment detection, security threat assessment, copyright violation detection, and malicious intent identification..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="mt-2"
                />
              </div>
              <Button onClick={analyzeSentiment} disabled={analyzing} className="w-full">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Performing Forensic Analysis...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Comprehensive Security Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Analysis Statistics</CardTitle>
              <CardDescription>Overview of threat patterns & sentiment data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Analyses</span>
                  <span className="text-2xl font-bold">{analyses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Positive Sentiment</span>
                  <span className="text-2xl font-bold text-green-500">
                    {analyses.filter(a => a.sentiment_label?.toLowerCase() === 'positive').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Negative/Suspicious</span>
                  <span className="text-2xl font-bold text-red-500">
                    {analyses.filter(a => ['negative', 'suspicious', 'malicious'].includes(a.sentiment_label?.toLowerCase())).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Security Flagged</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {analyses.filter(a => a.flagged).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastAnalysis && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Latest Forensic Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sentiment</p>
                  <div className={`mt-1 px-3 py-1 rounded-full text-xs font-medium border inline-block ${getSentimentColor(lastAnalysis.sentiment_label)}`}>
                    {lastAnalysis.sentiment_label?.toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Threat Level</p>
                  <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border inline-block ${getThreatBadgeColor(lastAnalysis.threat_level)}`}>
                    {lastAnalysis.threat_level?.toUpperCase() || 'NONE'}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold mt-1">{((lastAnalysis.sentiment_score || 0) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold mt-1">{lastAnalysis.flagged ? '🚨 FLAGGED' : '✅ CLEAR'}</p>
                </div>
              </div>

              {lastAnalysis.contextual_analysis && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Contextual Analysis:</p>
                  <p className="text-sm">{lastAnalysis.contextual_analysis}</p>
                </div>
              )}

              {lastAnalysis.copyright_indicators?.detected && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Copyright Violation Detected</AlertTitle>
                  <AlertDescription>
                    Confidence: {((lastAnalysis.copyright_indicators.confidence || 0) * 100).toFixed(0)}%
                    {lastAnalysis.copyright_indicators.markers?.length > 0 && (
                      <ul className="list-disc list-inside mt-2">
                        {lastAnalysis.copyright_indicators.markers.map((marker: string, idx: number) => (
                          <li key={idx}>{marker}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {lastAnalysis.malicious_indicators?.detected && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Malicious Intent Detected</AlertTitle>
                  <AlertDescription>
                    Confidence: {((lastAnalysis.malicious_indicators.confidence || 0) * 100).toFixed(0)}%
                    {lastAnalysis.malicious_indicators.patterns?.length > 0 && (
                      <ul className="list-disc list-inside mt-2">
                        {lastAnalysis.malicious_indicators.patterns.map((pattern: string, idx: number) => (
                          <li key={idx}>{pattern}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historical Analysis Results</CardTitle>
            <CardDescription>Recent forensic NLP security analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {analyses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No analyses performed yet. Submit content above for comprehensive security analysis.
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <div key={analysis.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(analysis.sentiment_label)}`}>
                          {analysis.sentiment_label || 'Unknown'}
                        </div>
                      </div>
                      {analysis.flagged && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">SECURITY FLAGGED</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm mb-3 line-clamp-3">{analysis.content}</p>
                    {analysis.keywords && analysis.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Keywords:</span>
                        {analysis.keywords.map((keyword: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-primary/10 rounded text-xs font-medium">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Confidence: {analysis.sentiment_score ? (analysis.sentiment_score * 100).toFixed(0) : 'N/A'}% | 
                      Analyzed: {new Date(analysis.analyzed_at).toLocaleString()}
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

export default SentimentAnalysis;
