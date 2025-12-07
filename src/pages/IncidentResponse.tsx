import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ArrowLeft, Plus, ChevronRight, Activity, Clock, Shield, Zap, Link2, Building2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import IncidentWorkflow from "@/components/IncidentWorkflow";
import IncidentTimeline from "@/components/IncidentTimeline";
import IncidentActions from "@/components/IncidentActions";
import { AutomatedIncidentCreator } from "@/components/AutomatedIncidentCreator";
import { IncidentReportGenerator } from "@/components/IncidentReportGenerator";
import { EnterpriseNetworkMonitor } from "@/components/EnterpriseNetworkMonitor";
import { GlobalSecurityOverview } from "@/components/GlobalSecurityOverview";
import { ThreatCorrelationEngine } from "@/components/ThreatCorrelationEngine";

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'note' | 'assignment' | 'detection';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  status?: string;
}

const IncidentResponse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [timelineEvents, setTimelineEvents] = useState<Map<string, TimelineEvent[]>>(new Map());

  useEffect(() => {
    checkAuth();
    loadIncidents();

    const channel = supabase
      .channel('incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        () => loadIncidents()
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

  const loadIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*, profiles!incidents_created_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (data) setIncidents(data);
  };

  const createIncident = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please provide an incident title",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('incidents')
      .insert([{
        title,
        description,
        severity: severity as any,
        created_by: user?.id
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create incident",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Incident created successfully",
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setSeverity("medium");
      loadIncidents();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('incidents')
      .update({ 
        status: status as any,
        resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update incident status",
        variant: "destructive",
      });
    } else {
      // Add timeline event
      addTimelineEvent(id, {
        id: crypto.randomUUID(),
        type: 'status_change',
        title: `Status changed to ${status}`,
        timestamp: new Date().toISOString(),
        status,
      });
      loadIncidents();
      
      if (selectedIncident?.id === id) {
        setSelectedIncident((prev: any) => prev ? { ...prev, status } : null);
      }
    }
  };

  const addTimelineEvent = (incidentId: string, event: TimelineEvent) => {
    setTimelineEvents(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(incidentId) || [];
      newMap.set(incidentId, [event, ...existing]);
      return newMap;
    });
  };

  const handleAddNote = (incidentId: string, note: string) => {
    addTimelineEvent(incidentId, {
      id: crypto.randomUUID(),
      type: 'note',
      title: 'Note Added',
      description: note,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    
    toast({
      title: "Note Added",
      description: "Investigation note has been saved",
    });
  };

  const handleActionExecuted = (actionName: string) => {
    if (selectedIncident) {
      addTimelineEvent(selectedIncident.id, {
        id: crypto.randomUUID(),
        type: 'assignment',
        title: `Action Executed: ${actionName}`,
        timestamp: new Date().toISOString(),
        user: 'Current User',
      });
    }
  };

  const openIncidentDetails = (incident: any) => {
    // Initialize timeline if not exists
    if (!timelineEvents.has(incident.id)) {
      setTimelineEvents(prev => {
        const newMap = new Map(prev);
        newMap.set(incident.id, [{
          id: crypto.randomUUID(),
          type: 'detection',
          title: 'Incident Detected',
          description: incident.description || 'Security incident detected and logged',
          timestamp: incident.created_at,
          status: 'open',
        }]);
        return newMap;
      });
    }
    setSelectedIncident(incident);
    setSheetOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-500/10 text-red-500';
      case 'investigating':
        return 'bg-orange-500/10 text-orange-500';
      case 'contained':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'resolved':
        return 'bg-green-500/10 text-green-500';
      case 'closed':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500';
      case 'high':
        return 'bg-orange-500/10 text-orange-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
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
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-warning" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Incident Response</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Track and manage security incidents</p>
            </div>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Report and track a new security incident
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the incident"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed information about the incident..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger id="severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createIncident} className="w-full">
                  Create Incident
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Enterprise Security Overview Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Enterprise Security Operations</h3>
          </div>
          <GlobalSecurityOverview className="mb-6" />
          <EnterpriseNetworkMonitor />
        </div>

        {/* Automated Incident Creator */}
        <div className="mb-8">
          <AutomatedIncidentCreator />
        </div>

        {/* Threat Correlation Engine */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Threat Correlation Engine</h3>
          </div>
          <ThreatCorrelationEngine />
        </div>

        {/* Incident Report Generator */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Incident Reports</h3>
          </div>
          <IncidentReportGenerator />
        </div>

        {/* Incident Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{incidents.length}</div>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {incidents.filter(i => i.status === 'open').length}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Investigating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {incidents.filter(i => i.status === 'investigating').length}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contained</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {incidents.filter(i => i.status === 'contained').length}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
            <CardDescription>Track and manage security incidents - click to view full workflow</CardDescription>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No incidents reported</p>
                <p className="text-xs mt-1">Create a new incident to start tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => openIncidentDetails(incident)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{incident.title}</h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created by {incident.profiles?.full_name || 'Unknown'} on{' '}
                          {new Date(incident.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                          {incident.severity.toUpperCase()}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                          {incident.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {incident.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {incident.resolved_at 
                          ? `Resolved ${new Date(incident.resolved_at).toLocaleDateString()}`
                          : 'In Progress'
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {timelineEvents.get(incident.id)?.length || 1} events
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incident Details Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedIncident && (
              <>
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity.toUpperCase()}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status.toUpperCase()}
                    </div>
                  </div>
                  <SheetTitle className="text-xl">{selectedIncident.title}</SheetTitle>
                  <SheetDescription>
                    {selectedIncident.description || 'No description provided'}
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="workflow" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="workflow" className="gap-2">
                      <Zap className="h-4 w-4" />
                      Workflow
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Actions
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="workflow" className="space-y-6">
                    <IncidentWorkflow
                      incident={selectedIncident}
                      onStatusChange={updateStatus}
                      onAddNote={handleAddNote}
                    />
                  </TabsContent>

                  <TabsContent value="actions">
                    <IncidentActions
                      incidentId={selectedIncident.id}
                      severity={selectedIncident.severity}
                      onActionExecuted={handleActionExecuted}
                    />
                  </TabsContent>

                  <TabsContent value="timeline">
                    <IncidentTimeline
                      events={timelineEvents.get(selectedIncident.id) || []}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default IncidentResponse;