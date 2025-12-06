import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Search, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  MessageSquare,
  ArrowRight,
  Zap
} from "lucide-react";

interface IncidentWorkflowProps {
  incident: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
  };
  onStatusChange: (id: string, status: string) => void;
  onAddNote: (id: string, note: string) => void;
}

const workflowStages = [
  { id: 'open', label: 'Detected', icon: AlertTriangle, color: 'text-destructive' },
  { id: 'investigating', label: 'Investigating', icon: Search, color: 'text-warning' },
  { id: 'contained', label: 'Contained', icon: Shield, color: 'text-accent' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-success' },
  { id: 'closed', label: 'Closed', icon: XCircle, color: 'text-muted-foreground' },
];

const IncidentWorkflow = ({ incident, onStatusChange, onAddNote }: IncidentWorkflowProps) => {
  const [note, setNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const currentStageIndex = workflowStages.findIndex(s => s.id === incident.status);
  const progress = ((currentStageIndex + 1) / workflowStages.length) * 100;

  const getNextStatus = () => {
    if (currentStageIndex < workflowStages.length - 1) {
      return workflowStages[currentStageIndex + 1].id;
    }
    return null;
  };

  const handleAdvance = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      onStatusChange(incident.id, nextStatus);
    }
  };

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote(incident.id, note);
      setNote("");
      setIsAddingNote(false);
    }
  };

  const getTimeElapsed = () => {
    const start = new Date(incident.created_at);
    const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Workflow Progress</span>
          <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Workflow Timeline */}
      <div className="relative">
        <div className="flex justify-between">
          {workflowStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isPending = index > currentStageIndex;
            
            return (
              <div
                key={stage.id}
                className={`flex flex-col items-center relative z-10 ${
                  isActive ? 'scale-110' : ''
                } transition-transform`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-success border-success text-success-foreground'
                      : isActive
                      ? 'bg-primary border-primary text-primary-foreground animate-pulse'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-0">
          <div
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${(currentStageIndex / (workflowStages.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Time Elapsed</p>
          <p className="font-bold text-foreground">{getTimeElapsed()}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Zap className="h-5 w-5 mx-auto mb-1 text-warning" />
          <p className="text-xs text-muted-foreground">Severity</p>
          <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
            {incident.severity.toUpperCase()}
          </Badge>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <User className="h-5 w-5 mx-auto mb-1 text-accent" />
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant="outline">{incident.status.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {getNextStatus() && (
          <Button onClick={handleAdvance} className="flex-1 gap-2">
            Advance to {workflowStages[currentStageIndex + 1]?.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setIsAddingNote(!isAddingNote)}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Add Note Section */}
      {isAddingNote && (
        <div className="space-y-3 p-4 border rounded-lg bg-card animate-in fade-in duration-200">
          <Textarea
            placeholder="Add investigation notes, findings, or actions taken..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsAddingNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentWorkflow;
