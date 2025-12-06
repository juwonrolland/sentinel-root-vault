import { 
  AlertTriangle, 
  Search, 
  Shield, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  User,
  Clock
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'note' | 'assignment' | 'detection';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  status?: string;
}

interface IncidentTimelineProps {
  events: TimelineEvent[];
}

const getEventIcon = (type: string, status?: string) => {
  if (type === 'note') return MessageSquare;
  if (type === 'assignment') return User;
  if (type === 'detection') return AlertTriangle;
  
  switch (status) {
    case 'investigating': return Search;
    case 'contained': return Shield;
    case 'resolved': return CheckCircle;
    case 'closed': return XCircle;
    default: return AlertTriangle;
  }
};

const getEventColor = (type: string, status?: string) => {
  if (type === 'note') return 'bg-accent text-accent-foreground';
  if (type === 'assignment') return 'bg-primary text-primary-foreground';
  if (type === 'detection') return 'bg-destructive text-destructive-foreground';
  
  switch (status) {
    case 'investigating': return 'bg-warning text-warning-foreground';
    case 'contained': return 'bg-accent text-accent-foreground';
    case 'resolved': return 'bg-success text-success-foreground';
    case 'closed': return 'bg-muted text-muted-foreground';
    default: return 'bg-destructive text-destructive-foreground';
  }
};

const IncidentTimeline = ({ events }: IncidentTimelineProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {events.map((event, index) => {
          const Icon = getEventIcon(event.type, event.status);
          const colorClass = getEventColor(event.type, event.status);
          
          return (
            <div
              key={event.id}
              className="relative pl-14 animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div
                className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass} shadow-lg`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-foreground">{event.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {event.description}
                  </p>
                )}
                
                {event.user && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.user}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentTimeline;
