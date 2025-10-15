import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SentimentAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [content, setContent] = useState("");

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
        body: { content }
      });

      if (error) throw error;

      toast({
        title: "Analysis Complete",
        description: data.message || "Sentiment analysis completed",
      });

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
        return 'bg-green-500/10 text-green-500';
      case 'negative':
        return 'bg-red-500/10 text-red-500';
      case 'neutral':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
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
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Sentiment Analysis</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Analyze Communication</CardTitle>
              <CardDescription>AI-powered sentiment and keyword analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content">Text Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter communication text, messages, or documents to analyze..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="mt-2"
                />
              </div>
              <Button onClick={analyzeSentiment} disabled={analyzing} className="w-full">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Sentiment"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Statistics</CardTitle>
              <CardDescription>Overview of sentiment patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Analyses</span>
                  <span className="text-2xl font-bold">{analyses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Positive</span>
                  <span className="text-2xl font-bold text-green-500">
                    {analyses.filter(a => a.sentiment_label?.toLowerCase() === 'positive').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Negative</span>
                  <span className="text-2xl font-bold text-red-500">
                    {analyses.filter(a => a.sentiment_label?.toLowerCase() === 'negative').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Flagged</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {analyses.filter(a => a.flagged).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Recent sentiment analysis results</CardDescription>
          </CardHeader>
          <CardContent>
            {analyses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No analyses performed yet
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <div key={analysis.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(analysis.sentiment_label)}`}>
                        {analysis.sentiment_label || 'Unknown'}
                      </div>
                      {analysis.flagged && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Flagged</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm mb-3 line-clamp-3">{analysis.content}</p>
                    {analysis.keywords && analysis.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {analysis.keywords.map((keyword: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Score: {analysis.sentiment_score ? (analysis.sentiment_score * 100).toFixed(0) : 'N/A'}% | 
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