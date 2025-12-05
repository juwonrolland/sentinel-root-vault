import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, CheckCircle, XCircle, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface PushNotificationSettingsProps {
  className?: string;
}

export const PushNotificationSettings = ({ className }: PushNotificationSettingsProps) => {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermission,
    sendTestNotification 
  } = usePushNotifications({ enabled: false });

  const getStatusConfig = () => {
    if (!isSupported) {
      return {
        icon: XCircle,
        label: "Not Supported",
        color: "text-muted-foreground",
        badge: "bg-muted text-muted-foreground",
      };
    }
    
    switch (permission) {
      case 'granted':
        return {
          icon: CheckCircle,
          label: "Enabled",
          color: "text-success",
          badge: "bg-success/20 text-success",
        };
      case 'denied':
        return {
          icon: BellOff,
          label: "Blocked",
          color: "text-destructive",
          badge: "bg-destructive/20 text-destructive",
        };
      default:
        return {
          icon: Bell,
          label: "Not Set",
          color: "text-warning",
          badge: "bg-warning/20 text-warning",
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <BellRing className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription className="text-xs">
                Receive real-time alerts for security events
              </CardDescription>
            </div>
          </div>
          <Badge className={status.badge}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive mb-2">
              Notifications are blocked. To enable them:
            </p>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
              <li>Click the lock icon in the address bar</li>
              <li>Find "Notifications" in the settings</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enable Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Security Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified for critical and high severity events
                  </p>
                </div>
              </div>
              <Switch 
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked && permission !== 'granted') {
                    requestPermission();
                  }
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {permission !== 'granted' ? (
                <Button 
                  onClick={requestPermission}
                  className="flex-1"
                  variant="default"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </Button>
              ) : (
                <Button 
                  onClick={sendTestNotification}
                  variant="outline"
                  className="flex-1"
                >
                  <BellRing className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Push notifications will alert you 
            to critical security events even when the app is in the background. This helps ensure 
            rapid response to potential threats.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
