import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, Volume2, VolumeX, Bell, BellOff, AlertTriangle, Smartphone } from "lucide-react";
import { AlertPreferences } from "@/hooks/useAlertPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface AlertSettingsPanelProps {
  preferences: AlertPreferences;
  onUpdatePreference: <K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K]
  ) => void;
  onTestSound?: () => void;
}

export const AlertSettingsPanel = ({
  preferences,
  onUpdatePreference,
  onTestSound,
}: AlertSettingsPanelProps) => {
  const [open, setOpen] = useState(false);
  const { permission, requestPermission, sendTestNotification } = usePushNotifications({ enabled: false });

  const handlePushToggle = async (checked: boolean) => {
    if (checked && permission !== 'granted') {
      const granted = await requestPermission();
      if (granted) {
        onUpdatePreference("pushEnabled", true);
      }
    } else {
      onUpdatePreference("pushEnabled", checked);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 sm:w-auto border-border/50 hover:bg-secondary/80 p-0 sm:px-3"
        >
          <Settings2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border/50" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Settings2 className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Alert Preferences</h4>
          </div>

          {/* Sound Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preferences.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-success" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="sound-toggle" className="text-sm font-medium">
                  Sound Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play audio for threats
                </p>
              </div>
            </div>
            <Switch
              id="sound-toggle"
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => onUpdatePreference("soundEnabled", checked)}
            />
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preferences.notificationsEnabled ? (
                <Bell className="h-4 w-4 text-success" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="notification-toggle" className="text-sm font-medium">
                  In-App Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Toast notifications
                </p>
              </div>
            </div>
            <Switch
              id="notification-toggle"
              checked={preferences.notificationsEnabled}
              onCheckedChange={(checked) => onUpdatePreference("notificationsEnabled", checked)}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className={`h-4 w-4 ${preferences.pushEnabled ? "text-success" : "text-muted-foreground"}`} />
              <div>
                <Label htmlFor="push-toggle" className="text-sm font-medium">
                  Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Background alerts
                </p>
              </div>
            </div>
            <Switch
              id="push-toggle"
              checked={preferences.pushEnabled && permission === 'granted'}
              onCheckedChange={handlePushToggle}
            />
          </div>

          {/* Critical Only */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-4 w-4 ${preferences.criticalOnly ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <Label htmlFor="critical-toggle" className="text-sm font-medium">
                  Critical Only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ignore high severity
                </p>
              </div>
            </div>
            <Switch
              id="critical-toggle"
              checked={preferences.criticalOnly}
              onCheckedChange={(checked) => onUpdatePreference("criticalOnly", checked)}
            />
          </div>

          {/* Test Buttons */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            {onTestSound && preferences.soundEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onTestSound}
              >
                <Volume2 className="h-3 w-3 mr-2" />
                Test Alert Sound
              </Button>
            )}
            {preferences.pushEnabled && permission === 'granted' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={sendTestNotification}
              >
                <Smartphone className="h-3 w-3 mr-2" />
                Test Push Notification
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
