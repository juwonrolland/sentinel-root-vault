import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Eye, 
  AlertTriangle, 
  Shield, 
  Users,
  Key,
  Lock,
  FileSearch,
  Target,
  Activity,
  Clock,
  User,
  MapPin,
  Globe,
  Fingerprint,
  Database,
  FileText,
  AlertOctagon,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface LeakDetection {
  id: string;
  type: 'data_leak' | 'credential_leak' | 'insider_threat' | 'unauthorized_access';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  content: string;
  keywords: string[];
  detectedAt: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  location: string;
  status: 'investigating' | 'confirmed' | 'false_positive' | 'remediated';
  accessType: string;
  dataClassification: string;
}

interface AccessLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskScore: number;
}

interface SentimentAlert {
  id: string;
  content: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  score: number;
  keywords: string[];
  source: string;
  timestamp: string;
  flagged: boolean;
  threatIndicators: string[];
}

const securityKeywords = [
  'password', 'credentials', 'secret', 'api key', 'token', 'private', 'confidential',
  'classified', 'restricted', 'internal only', 'ssn', 'credit card', 'bank account',
  'social security', 'passport', 'license', 'medical records', 'pii', 'phi',
  'trade secret', 'proprietary', 'merger', 'acquisition', 'financial', 'breach',
  'leak', 'hack', 'exploit', 'vulnerability', 'attack', 'malware', 'ransomware'
];

export const LeakDetectionSystem: React.FC = () => {
  const [detections, setDetections] = useState<LeakDetection[]>([
    {
      id: 'ld-1',
      type: 'data_leak',
      severity: 'critical',
      source: 'External Monitoring',
      content: 'Customer database records detected on dark web forum',
      keywords: ['customer data', 'database', 'pii'],
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      userId: 'user-123',
      userEmail: 'analyst@company.com',
      ipAddress: '192.168.1.45',
      location: 'New York, US',
      status: 'investigating',
      accessType: 'Database Export',
      dataClassification: 'Confidential'
    },
    {
      id: 'ld-2',
      type: 'credential_leak',
      severity: 'high',
      source: 'Paste Site Monitor',
      content: 'API credentials found in public code repository',
      keywords: ['api key', 'credentials', 'github'],
      detectedAt: new Date(Date.now() - 7200000).toISOString(),
      userEmail: 'developer@company.com',
      ipAddress: '10.0.0.22',
      location: 'San Francisco, US',
      status: 'confirmed',
      accessType: 'Code Commit',
      dataClassification: 'Secret'
    },
    {
      id: 'ld-3',
      type: 'insider_threat',
      severity: 'high',
      source: 'Behavior Analytics',
      content: 'Unusual data access pattern detected - large volume download',
      keywords: ['bulk download', 'unusual access'],
      detectedAt: new Date(Date.now() - 14400000).toISOString(),
      userId: 'user-456',
      userEmail: 'employee@company.com',
      ipAddress: '192.168.1.78',
      location: 'Chicago, US',
      status: 'investigating',
      accessType: 'File Download',
      dataClassification: 'Internal'
    }
  ]);

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [sentimentAlerts, setSentimentAlerts] = useState<SentimentAlert[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>([...securityKeywords]);
  const [newKeyword, setNewKeyword] = useState('');
  const [scanText, setScanText] = useState('');
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(true);

  // Load access logs from Supabase
  useEffect(() => {
    const loadAccessLogs = async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (data) {
        setAccessLogs(data.map(log => ({
          id: log.id,
          userId: log.user_id || 'unknown',
          userEmail: (log.metadata as any)?.email || 'unknown@unknown.com',
          action: log.action,
          resource: log.resource,
          timestamp: log.timestamp || new Date().toISOString(),
          ipAddress: log.ip_address || 'unknown',
          userAgent: log.user_agent || 'unknown',
          success: log.success || false,
          riskScore: Math.floor(Math.random() * 100)
        })));
      }
    };

    loadAccessLogs();

    // Real-time subscription
    const channel = supabase
      .channel('leak-detection')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_logs' },
        (payload) => {
          const log = payload.new as any;
          analyzeAccessLog(log);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load sentiment analysis data
  useEffect(() => {
    const loadSentimentData = async () => {
      const { data, error } = await supabase
        .from('sentiment_analysis')
        .select('*')
        .eq('flagged', true)
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (data) {
        setSentimentAlerts(data.map(item => ({
          id: item.id,
          content: item.content,
          sentiment: item.sentiment_label as any || 'neutral',
          score: item.sentiment_score || 0,
          keywords: item.keywords || [],
          source: 'Content Analysis',
          timestamp: item.analyzed_at || new Date().toISOString(),
          flagged: item.flagged || false,
          threatIndicators: extractThreatIndicators(item.content, item.keywords || [])
        })));
      }
    };

    loadSentimentData();
  }, []);

  const analyzeAccessLog = (log: any) => {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /bulk|export|download/i, type: 'data_leak', severity: 'high' as const },
      { pattern: /admin|root|sudo/i, type: 'unauthorized_access', severity: 'critical' as const },
      { pattern: /delete|drop|truncate/i, type: 'insider_threat', severity: 'high' as const }
    ];

    for (const { pattern, type, severity } of suspiciousPatterns) {
      if (pattern.test(log.action) || pattern.test(log.resource)) {
        const detection: LeakDetection = {
          id: `ld-${Date.now()}`,
          type: type as LeakDetection['type'],
          severity,
          source: 'Access Log Analysis',
          content: `Suspicious activity: ${log.action} on ${log.resource}`,
          keywords: extractKeywords(log.action + ' ' + log.resource),
          detectedAt: new Date().toISOString(),
          userId: log.user_id,
          ipAddress: log.ip_address || 'unknown',
          location: 'Geolocating...',
          status: 'investigating',
          accessType: log.action,
          dataClassification: 'Unknown'
        };
        setDetections(prev => [detection, ...prev]);
        toast.warning('Potential leak detected', {
          description: detection.content
        });
        break;
      }
    }
  };

  const extractKeywords = (text: string): string[] => {
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    for (const keyword of customKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }
    return found;
  };

  const extractThreatIndicators = (content: string, keywords: string[]): string[] => {
    const indicators: string[] = [];
    if (content.toLowerCase().includes('password')) indicators.push('Credential Exposure');
    if (content.toLowerCase().includes('database')) indicators.push('Data Access');
    if (keywords.some(k => k.toLowerCase().includes('pii'))) indicators.push('PII Risk');
    if (keywords.some(k => k.toLowerCase().includes('financial'))) indicators.push('Financial Data');
    return indicators;
  };

  const scanContent = () => {
    const foundKeywords = extractKeywords(scanText);
    if (foundKeywords.length > 0) {
      toast.warning('Sensitive keywords detected!', {
        description: `Found: ${foundKeywords.join(', ')}`
      });
      
      const detection: LeakDetection = {
        id: `ld-${Date.now()}`,
        type: 'data_leak',
        severity: foundKeywords.length > 3 ? 'critical' : foundKeywords.length > 1 ? 'high' : 'medium',
        source: 'Manual Scan',
        content: scanText.substring(0, 200) + '...',
        keywords: foundKeywords,
        detectedAt: new Date().toISOString(),
        ipAddress: 'local',
        location: 'Manual Analysis',
        status: 'investigating',
        accessType: 'Content Scan',
        dataClassification: 'Unknown'
      };
      setDetections(prev => [detection, ...prev]);
    } else {
      toast.success('No sensitive keywords detected');
    }
    setScanText('');
  };

  const addKeyword = () => {
    if (newKeyword && !customKeywords.includes(newKeyword.toLowerCase())) {
      setCustomKeywords(prev => [...prev, newKeyword.toLowerCase()]);
      setNewKeyword('');
      toast.success(`Keyword "${newKeyword}" added`);
    }
  };

  const removeKeyword = (keyword: string) => {
    setCustomKeywords(prev => prev.filter(k => k !== keyword));
  };

  const updateDetectionStatus = (id: string, status: LeakDetection['status']) => {
    setDetections(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    toast.success(`Detection status updated to ${status}`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating': return <Search className="h-4 w-4" />;
      case 'confirmed': return <AlertOctagon className="h-4 w-4" />;
      case 'false_positive': return <XCircle className="h-4 w-4" />;
      case 'remediated': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent border-red-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/20">
                <FileSearch className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Leak Detection & Source Identification</h2>
                <p className="text-muted-foreground">Advanced data loss prevention with sentiment analysis integration</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Real-time Monitoring</Label>
                <Switch checked={realTimeMonitoring} onCheckedChange={setRealTimeMonitoring} />
              </div>
              <Badge variant={realTimeMonitoring ? 'default' : 'secondary'} className="gap-1">
                <Activity className="h-3 w-3" />
                {realTimeMonitoring ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-background/50 rounded-lg border border-red-500/20">
              <div className="text-3xl font-bold text-red-400">{detections.filter(d => d.severity === 'critical').length}</div>
              <div className="text-xs text-muted-foreground">Critical Leaks</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-orange-500/20">
              <div className="text-3xl font-bold text-orange-400">{detections.filter(d => d.status === 'investigating').length}</div>
              <div className="text-xs text-muted-foreground">Investigating</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-yellow-500/20">
              <div className="text-3xl font-bold text-yellow-400">{sentimentAlerts.filter(a => a.flagged).length}</div>
              <div className="text-xs text-muted-foreground">Flagged Content</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-400">{customKeywords.length}</div>
              <div className="text-xs text-muted-foreground">Active Keywords</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-green-500/20">
              <div className="text-3xl font-bold text-green-400">{detections.filter(d => d.status === 'remediated').length}</div>
              <div className="text-xs text-muted-foreground">Remediated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="detections" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="detections" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Leak Detections
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sentiment Alerts
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Manual Scan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detections">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Active Leak Detections</CardTitle>
              <CardDescription>Identified data leaks and source tracing</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {detections.map(detection => (
                    <div 
                      key={detection.id}
                      className={`p-4 rounded-lg border ${
                        detection.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                        detection.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                        'bg-background/50 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(detection.severity)}>
                            {detection.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{detection.type.replace('_', ' ')}</Badge>
                          <Badge variant="secondary" className="gap-1">
                            {getStatusIcon(detection.status)}
                            {detection.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(detection.detectedAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm mb-3">{detection.content}</p>

                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Source User
                          </div>
                          <div className="font-mono">{detection.userEmail || 'Unknown'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" /> IP Address
                          </div>
                          <div className="font-mono">{detection.ipAddress}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Location
                          </div>
                          <div>{detection.location}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Classification
                          </div>
                          <div>{detection.dataClassification}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-muted-foreground">Keywords:</span>
                        {detection.keywords.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant={detection.status === 'confirmed' ? 'default' : 'outline'}
                          onClick={() => updateDetectionStatus(detection.id, 'confirmed')}
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant={detection.status === 'false_positive' ? 'default' : 'outline'}
                          onClick={() => updateDetectionStatus(detection.id, 'false_positive')}
                        >
                          False Positive
                        </Button>
                        <Button 
                          size="sm" 
                          variant={detection.status === 'remediated' ? 'default' : 'outline'}
                          onClick={() => updateDetectionStatus(detection.id, 'remediated')}
                        >
                          Mark Remediated
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Access Control Monitoring</CardTitle>
              <CardDescription>Track user access patterns and identify anomalies</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {accessLogs.map(log => (
                    <div 
                      key={log.id}
                      className={`p-3 rounded-lg border ${log.riskScore > 70 ? 'bg-red-500/10 border-red-500/30' : log.riskScore > 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-background/50 border-border'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-400' : 'bg-red-400'}`} />
                          <div>
                            <span className="font-semibold">{log.action}</span>
                            <span className="text-muted-foreground mx-2">→</span>
                            <span className="font-mono text-sm">{log.resource}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={log.riskScore > 70 ? 'destructive' : log.riskScore > 40 ? 'secondary' : 'outline'}>
                            Risk: {log.riskScore}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>User: {log.userEmail}</span>
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Sentiment-Based Threat Detection</CardTitle>
              <CardDescription>Content flagged by sentiment analysis for potential security concerns</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sentimentAlerts.map(alert => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-lg border ${alert.sentiment === 'negative' ? 'bg-red-500/10 border-red-500/30' : 'bg-background/50 border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                            {alert.sentiment} ({(alert.score * 100).toFixed(0)}%)
                          </Badge>
                          {alert.threatIndicators.map((ind, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{ind}</Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.content.substring(0, 200)}...</p>
                      <div className="flex gap-1 flex-wrap">
                        {alert.keywords.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Security Keywords Management</CardTitle>
              <CardDescription>Keywords used for leak detection and content scanning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input 
                  placeholder="Add new keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword}>Add</Button>
              </div>
              <ScrollArea className="h-[350px]">
                <div className="flex flex-wrap gap-2">
                  {customKeywords.map((keyword, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword}
                      <XCircle className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Manual Content Scan</CardTitle>
              <CardDescription>Scan text for sensitive keywords and potential data leaks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea 
                  placeholder="Paste content to scan for sensitive information..."
                  className="min-h-[200px]"
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                />
                <Button onClick={scanContent} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Scan for Sensitive Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeakDetectionSystem;
