import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  Shield,
  Target,
  AlertTriangle,
  Crosshair,
  Loader2,
  Zap,
  Eye,
  Lock,
  Skull,
  Radio,
  Sparkles,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ThreatAnalysisResult {
  threat_type: string;
  severity: string;
  confidence_score: number;
  details: string;
  indicators: string[];
  affected_systems?: string[];
  recommended_actions?: string[];
}

export const AIThreatAnalyzer = () => {
  const [logData, setLogData] = useState("");
  const [analysis, setAnalysis] = useState<ThreatAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeLog = async () => {
    if (!logData.trim()) {
      toast.error("Please enter log data to analyze");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-threat", {
        body: { logData },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setAnalysis(data.data);
      toast.success("Threat analysis completed");
    } catch (err) {
      console.error("Analysis error:", err);
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "high":
        return "bg-warning/20 text-warning border-warning/30";
      case "medium":
        return "bg-info/20 text-info border-info/30";
      case "low":
        return "bg-success/20 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-destructive";
    if (score >= 0.6) return "bg-warning";
    if (score >= 0.4) return "bg-info";
    return "bg-success";
  };

  const sampleLogs = [
    "Failed login attempt from IP 185.220.101.42 - User: admin - Timestamp: 2024-01-15T10:23:45Z",
    "Multiple SSH connections from 192.168.1.100 to internal servers - Port scan detected",
    "Unusual outbound traffic to external IP 45.33.32.156 on port 4444 - Potential C2 communication",
    "File modification detected: /etc/passwd - User: unknown - Permission change observed",
  ];

  const loadSampleLog = () => {
    const sample = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
    setLogData(sample);
  };

  return (
    <Card className="cyber-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="relative">
              <Brain className="h-4 w-4 text-primary" />
              <Sparkles className="h-2 w-2 text-accent absolute -top-0.5 -right-0.5" />
            </div>
            <span className="text-gradient">SENTINEL-AI</span>
            <span className="text-muted-foreground text-xs">Threat Intelligence</span>
          </CardTitle>
          {analysis && (
            <Badge variant="outline" className={cn("text-[10px]", getSeverityColor(analysis.severity))}>
              {analysis.severity?.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Log Data Input</span>
            <Button variant="ghost" size="sm" onClick={loadSampleLog} className="h-6 text-[10px]">
              <FileSearch className="h-3 w-3 mr-1" />
              Load Sample
            </Button>
          </div>
          <Textarea
            placeholder="Paste security logs, network traffic data, or suspicious activity here for AI-powered threat analysis..."
            value={logData}
            onChange={(e) => setLogData(e.target.value)}
            className="min-h-[100px] text-xs font-mono bg-secondary/30 border-border/50 resize-none"
          />
        </div>

        {/* Analyze Button */}
        <Button
          onClick={analyzeLog}
          disabled={isAnalyzing || !logData.trim()}
          className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Threat Vectors...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Initialize AI Analysis
            </>
          )}
        </Button>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="text-center py-6">
            <div className="relative inline-block mb-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
            </div>
            <p className="text-xs text-primary font-mono animate-pulse">
              NEURAL ANALYSIS IN PROGRESS...
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isAnalyzing && (
          <div className="text-center py-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-4 animate-fade-in">
            {/* Threat Score */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-mono">CONFIDENCE SCORE</span>
                <span className="text-xl font-bold font-mono">
                  {Math.round(analysis.confidence_score * 100)}%
                </span>
              </div>
              <Progress value={analysis.confidence_score * 100} className="h-2" />
              <div 
                className={cn("h-1 rounded-full mt-1 transition-all", getScoreColor(analysis.confidence_score))} 
                style={{ width: `${analysis.confidence_score * 100}%` }} 
              />
            </div>

            {/* Threat Type */}
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-destructive" />
                <span className="text-xs font-semibold text-destructive uppercase">Threat Classification</span>
              </div>
              <p className="text-sm font-medium">{analysis.threat_type}</p>
            </div>

            {/* Details */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-info" />
                <span className="text-xs font-semibold text-info uppercase">Analysis Details</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{analysis.details}</p>
            </div>

            {/* Indicators */}
            {analysis.indicators && analysis.indicators.length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase mb-2 block">
                  IOC Indicators
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.indicators.slice(0, 6).map((ioc, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono bg-secondary/50">
                      {ioc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase mb-2 block">
                  Recommended Actions
                </span>
                <div className="space-y-1">
                  {analysis.recommended_actions.slice(0, 3).map((action, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/10 text-xs"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
