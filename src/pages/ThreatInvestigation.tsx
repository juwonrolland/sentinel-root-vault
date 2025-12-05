import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  Filter,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Globe,
  Server,
  Activity,
  FileText,
  Eye,
  Download,
  RefreshCw,
  ChevronRight,
  MapPin,
  Fingerprint,
  Network,
  Terminal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import logo from "@/assets/logo.png";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string | null;
  source_ip: string | null;
  user_agent: string | null;
  detected_at: string;
  metadata: any;
  created_by: string | null;
}

interface ForensicData {
  geoLocation: { country: string; city: string; region: string; isp: string };
  threatIndicators: string[];
  attackVector: string;
  affectedSystems: string[];
  timeline: { time: string; action: string }[];
  relatedEvents: SecurityEvent[];
  riskScore: number;
  mitreTactics: string[];
}

// Simulate forensic data based on event
const generateForensicData = (event: SecurityEvent): ForensicData => {
  const ipParts = (event.source_ip || "0.0.0.0").split(".").map(Number);
  const hash = ipParts.reduce((a, b) => a + b, 0);
  
  const countries = ["Russia", "China", "North Korea", "Iran", "Unknown", "United States", "Brazil", "India"];
  const cities = ["Moscow", "Beijing", "Pyongyang", "Tehran", "Unknown", "New York", "São Paulo", "Mumbai"];
  const isps = ["AS12345 Evil Corp", "AS67890 Shadow Net", "AS11111 Dark ISP", "AS22222 Unknown Provider"];
  
  const attackVectors = [
    "Credential Stuffing",
    "SQL Injection",
    "Cross-Site Scripting (XSS)",
    "Remote Code Execution",
    "Phishing Campaign",
    "DDoS Attack",
    "Man-in-the-Middle",
    "Privilege Escalation",
  ];

  const mitreTactics = [
    "TA0001: Initial Access",
    "TA0002: Execution",
    "TA0003: Persistence",
    "TA0004: Privilege Escalation",
    "TA0005: Defense Evasion",
    "TA0006: Credential Access",
    "TA0007: Discovery",
    "TA0008: Lateral Movement",
  ];

  const selectedTactics = mitreTactics
    .sort(() => Math.random() - 0.5)
    .slice(0, 2 + (hash % 3));

  return {
    geoLocation: {
      country: countries[hash % countries.length],
      city: cities[hash % cities.length],
      region: "Region " + (hash % 10),
      isp: isps[hash % isps.length],
    },
    threatIndicators: [
      `Suspicious IP: ${event.source_ip}`,
      `Known malicious signature detected`,
      `Behavioral anomaly score: ${60 + (hash % 40)}%`,
      `Threat intelligence match: ${hash % 5} databases`,
    ],
    attackVector: attackVectors[hash % attackVectors.length],
    affectedSystems: [
      "web-server-01",
      "api-gateway",
      "database-primary",
    ].slice(0, 1 + (hash % 3)),
    timeline: [
      { time: "-5m", action: "Initial connection detected" },
      { time: "-4m", action: "Authentication attempt" },
      { time: "-3m", action: "Anomalous behavior flagged" },
      { time: "-2m", action: "Threat signature matched" },
      { time: "0m", action: "Alert generated" },
      { time: "+1m", action: "Automated response initiated" },
    ],
    relatedEvents: [],
    riskScore: 40 + (hash % 60),
    mitreTactics: selectedTactics,
  };
};

const severityConfig = {
  critical: { color: "bg-destructive text-destructive-foreground", icon: ShieldAlert, label: "CRITICAL" },
  high: { color: "bg-warning text-warning-foreground", icon: AlertTriangle, label: "HIGH" },
  medium: { color: "bg-info text-info-foreground", icon: Activity, label: "MEDIUM" },
  low: { color: "bg-muted text-muted-foreground", icon: Eye, label: "LOW" },
};

const ThreatInvestigation = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [forensicData, setForensicData] = useState<ForensicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
    loadEvents();

    const channel = supabase
      .channel('investigation-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, () => loadEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        selectEvent(event);
      }
    }
  }, [searchParams, events]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100);

    if (data && !error) {
      setEvents(data);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
    toast({ title: "Data refreshed", description: "Security events updated" });
  };

  const selectEvent = async (event: SecurityEvent) => {
    setSelectedEvent(event);
    setSearchParams({ event: event.id });
    
    // Generate forensic data
    const forensic = generateForensicData(event);
    
    // Load related events
    const { data: related } = await supabase
      .from('security_events')
      .select('*')
      .or(`source_ip.eq.${event.source_ip},event_type.eq.${event.event_type}`)
      .neq('id', event.id)
      .order('detected_at', { ascending: false })
      .limit(5);
    
    forensic.relatedEvents = related || [];
    setForensicData(forensic);
  };

  const closeDetail = () => {
    setSelectedEvent(null);
    setForensicData(null);
    setSearchParams({});
  };

  const exportEvent = () => {
    if (!selectedEvent || !forensicData) return;
    
    const exportData = {
      event: selectedEvent,
      forensicAnalysis: forensicData,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-investigation-${selectedEvent.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Export complete", description: "Forensic report downloaded" });
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.source_ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gradient">Threat Investigation</h1>
                  <p className="text-xs text-muted-foreground font-mono">FORENSIC ANALYSIS CENTER</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Events List */}
          <div className={cn("lg:col-span-5", selectedEvent && "hidden lg:block")}>
            <Card className="cyber-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Security Events ({filteredEvents.length})
                </CardTitle>
                
                {/* Filters */}
                <div className="flex gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32 h-9">
                      <Filter className="h-3 w-3 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No events found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {filteredEvents.map((event) => {
                        const config = severityConfig[event.severity];
                        const Icon = config.icon;
                        const isSelected = selectedEvent?.id === event.id;
                        
                        return (
                          <button
                            key={event.id}
                            onClick={() => selectEvent(event)}
                            className={cn(
                              "w-full p-4 text-left hover:bg-secondary/30 transition-colors",
                              isSelected && "bg-primary/10 border-l-2 border-l-primary"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", config.color)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm truncate">{event.event_type}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {config.label}
                                  </Badge>
                                </div>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
                                  </span>
                                  {event.source_ip && (
                                    <span className="font-mono">{event.source_ip}</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Event Detail Panel */}
          <div className={cn("lg:col-span-7", !selectedEvent && "hidden lg:flex lg:items-center lg:justify-center")}>
            {selectedEvent && forensicData ? (
              <Card className="cyber-card h-full">
                <CardHeader className="pb-4 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={severityConfig[selectedEvent.severity].color}>
                        {severityConfig[selectedEvent.severity].label}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        ID: {selectedEvent.id.slice(0, 8)}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{selectedEvent.event_type}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportEvent}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="ghost" size="icon" onClick={closeDetail} className="lg:hidden">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="forensics">Forensics</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                      <TabsTrigger value="related">Related</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      {/* Risk Score */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Risk Score</span>
                          <span className={cn(
                            "text-2xl font-bold",
                            forensicData.riskScore >= 80 ? "text-destructive" :
                            forensicData.riskScore >= 60 ? "text-warning" : "text-success"
                          )}>
                            {forensicData.riskScore}%
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              forensicData.riskScore >= 80 ? "bg-destructive" :
                              forensicData.riskScore >= 60 ? "bg-warning" : "bg-success"
                            )}
                            style={{ width: `${forensicData.riskScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Key Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Source IP</span>
                          </div>
                          <p className="font-mono text-sm">{selectedEvent.source_ip || "Unknown"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-warning" />
                            <span className="text-xs text-muted-foreground">Location</span>
                          </div>
                          <p className="text-sm">{forensicData.geoLocation.city}, {forensicData.geoLocation.country}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-info" />
                            <span className="text-xs text-muted-foreground">Attack Vector</span>
                          </div>
                          <p className="text-sm">{forensicData.attackVector}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-accent" />
                            <span className="text-xs text-muted-foreground">Detected</span>
                          </div>
                          <p className="text-sm">{format(new Date(selectedEvent.detected_at), "PPpp")}</p>
                        </div>
                      </div>

                      {/* MITRE ATT&CK */}
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-destructive" />
                          MITRE ATT&CK Tactics
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {forensicData.mitreTactics.map((tactic, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tactic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="forensics" className="space-y-4">
                      {/* Threat Indicators */}
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Threat Indicators
                        </h4>
                        <ul className="space-y-2">
                          {forensicData.threatIndicators.map((indicator, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{indicator}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Geo Location */}
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-info" />
                          Geolocation Data
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Country:</span>
                            <span className="ml-2">{forensicData.geoLocation.country}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">City:</span>
                            <span className="ml-2">{forensicData.geoLocation.city}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Region:</span>
                            <span className="ml-2">{forensicData.geoLocation.region}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ISP:</span>
                            <span className="ml-2 text-xs">{forensicData.geoLocation.isp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Affected Systems */}
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Server className="h-4 w-4 text-destructive" />
                          Affected Systems
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {forensicData.affectedSystems.map((system, i) => (
                            <Badge key={i} variant="destructive" className="text-xs font-mono">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Raw Data */}
                      {selectedEvent.user_agent && (
                        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-primary" />
                            User Agent
                          </h4>
                          <code className="text-xs text-muted-foreground break-all">
                            {selectedEvent.user_agent}
                          </code>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-4">
                      <div className="relative">
                        {forensicData.timeline.map((item, i) => (
                          <div key={i} className="flex gap-4 pb-4">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-3 h-3 rounded-full border-2",
                                i === forensicData.timeline.length - 2 
                                  ? "bg-destructive border-destructive" 
                                  : "bg-background border-primary"
                              )} />
                              {i < forensicData.timeline.length - 1 && (
                                <div className="w-0.5 h-full bg-border/50 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-primary">{item.time}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{item.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="related" className="space-y-4">
                      {forensicData.relatedEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No related events found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {forensicData.relatedEvents.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => selectEvent(event)}
                              className="w-full p-3 rounded-lg bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <Badge className={severityConfig[event.severity].color} variant="outline">
                                  {event.severity.toUpperCase()}
                                </Badge>
                                <span className="text-sm flex-1 truncate">{event.event_type}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-muted-foreground">
                <Eye className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select an event to investigate</p>
                <p className="text-sm">Click on any security event to view forensic details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThreatInvestigation;
