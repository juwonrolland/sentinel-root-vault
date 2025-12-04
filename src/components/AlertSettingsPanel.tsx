import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, Volume2, VolumeX, Bell, BellOff, AlertTriangle } from "lucide-react";
import { AlertPreferences } from "@/hooks/useAlertPreferences";

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-border/50 hover:bg-secondary/80"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Alert Settings</span>
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
                  Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Browser notifications
                </p>
              </div>
            </div>
            <Switch
              id="notification-toggle"
              checked={preferences.notificationsEnabled}
              onCheckedChange={(checked) => onUpdatePreference("notificationsEnabled", checked)}
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

          {/* Test Button */}
          {onTestSound && preferences.soundEnabled && (
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onTestSound}
              >
                <Volume2 className="h-3 w-3 mr-2" />
                Test Alert Sound
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
