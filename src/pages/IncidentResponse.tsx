import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const IncidentResponse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");

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
      loadIncidents();
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{incidents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">
                {incidents.filter(i => i.status === 'open').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Investigating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {incidents.filter(i => i.status === 'investigating').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contained</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {incidents.filter(i => i.status === 'contained').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
            <CardDescription>Track and manage security incidents</CardDescription>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No incidents reported
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{incident.title}</h3>
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
                      <p className="text-sm mb-3">{incident.description}</p>
                    )}
                    
                    <div className="flex gap-2">
                      <Select
                        value={incident.status}
                        onValueChange={(value) => updateStatus(incident.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="contained">Contained</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
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

export default IncidentResponse;