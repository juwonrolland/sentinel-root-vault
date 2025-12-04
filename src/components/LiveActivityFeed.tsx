import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ActivityFeedItem {
  id: string;
  type: "threat" | "alert" | "info" | "success";
  message: string;
  timestamp: Date;
  source?: string;
}

interface LiveActivityFeedProps {
  items: ActivityFeedItem[];
  maxItems?: number;
  className?: string;
}

export const LiveActivityFeed = ({ items, maxItems = 10, className }: LiveActivityFeedProps) => {
  const [displayItems, setDisplayItems] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    setDisplayItems(items.slice(0, maxItems));
  }, [items, maxItems]);

  const getTypeStyles = (type: ActivityFeedItem["type"]) => {
    switch (type) {
      case "threat":
        return {
          dot: "bg-destructive",
          border: "border-l-destructive",
          text: "text-destructive",
        };
      case "alert":
        return {
          dot: "bg-warning",
          border: "border-l-warning",
          text: "text-warning",
        };
      case "success":
        return {
          dot: "bg-success",
          border: "border-l-success",
          text: "text-success",
        };
      default:
        return {
          dot: "bg-info",
          border: "border-l-info",
          text: "text-info",
        };
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  };

  return (
    <div className={cn("space-y-2 overflow-hidden", className)}>
      {displayItems.map((item, index) => {
        const styles = getTypeStyles(item.type);
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border-l-2 transition-all duration-300",
              styles.border,
              "animate-slide-down"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn("w-2 h-2 rounded-full mt-1.5 animate-pulse", styles.dot)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{item.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {formatTime(item.timestamp)}
                </span>
                {item.source && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {displayItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No activity to display</p>
        </div>
      )}
    </div>
  );
};
