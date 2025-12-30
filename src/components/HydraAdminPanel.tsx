import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Shield, 
  Zap, 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Globe,
  Lock,
  Unlock
} from "lucide-react";
import { toast } from "sonner";
import { useSecuritySounds, SoundType } from "@/hooks/useSecuritySounds";

interface HydraAdminPanelProps {
  onSpawnNode?: () => void;
  onDestroyNode?: () => void;
  onToggleDefense?: (enabled: boolean) => void;
  onSoundSettingChange?: (enabled: boolean) => void;
  soundEnabled?: boolean;
  className?: string;
}

interface DefenseConfig {
  autoSpawn: boolean;
  aggressiveMode: boolean;
  stealthMode: boolean;
  ddosProtection: boolean;
  layer4Protection: boolean;
  rootkitScanning: boolean;
}

const HydraAdminPanel: React.FC<HydraAdminPanelProps> = ({
  onSpawnNode,
  onDestroyNode,
  onToggleDefense,
  onSoundSettingChange,
  soundEnabled = true,
  className = "",
}) => {
  const [config, setConfig] = useState<DefenseConfig>({
    autoSpawn: true,
    aggressiveMode: false,
    stealthMode: true,
    ddosProtection: true,
    layer4Protection: true,
    rootkitScanning: true,
  });
  const [spawnRate, setSpawnRate] = useState([50]);
  const [threatSensitivity, setThreatSensitivity] = useState([75]);
  const [isLocked, setIsLocked] = useState(false);

  const { playSound } = useSecuritySounds({ enabled: soundEnabled });

  const handleSpawnNode = useCallback(() => {
    if (isLocked) {
      toast.error("Panel is locked");
      return;
    }
    playSound("node_spawned");
    onSpawnNode?.();
    toast.success("New Hydra node spawned", {
      description: "Node is now active and processing requests",
    });
  }, [isLocked, playSound, onSpawnNode]);

  const handleDestroyNode = useCallback(() => {
    if (isLocked) {
      toast.error("Panel is locked");
      return;
    }
    playSound("node_destroyed");
    onDestroyNode?.();
    toast.warning("Hydra node destroyed", {
      description: "Two new nodes will spawn to replace it",
    });
  }, [isLocked, playSound, onDestroyNode]);

  const handleConfigChange = useCallback(
    (key: keyof DefenseConfig, value: boolean) => {
      if (isLocked) {
        toast.error("Panel is locked");
        return;
      }
      setConfig((prev) => ({ ...prev, [key]: value }));
      
      if (value) {
        playSound("threat_mitigated");
      }
      
      toast.info(`${key.replace(/([A-Z])/g, " $1").trim()} ${value ? "enabled" : "disabled"}`);
      
      if (key === "aggressiveMode" || key === "ddosProtection") {
        onToggleDefense?.(value);
      }
    },
    [isLocked, playSound, onToggleDefense]
  );

  const handleSoundToggle = useCallback(() => {
    const newValue = !soundEnabled;
    onSoundSettingChange?.(newValue);
    if (newValue) {
      setTimeout(() => playSound("threat_mitigated"), 100);
    }
    toast.info(`Sound effects ${newValue ? "enabled" : "disabled"}`);
  }, [soundEnabled, onSoundSettingChange, playSound]);

  const handleTestAlert = useCallback((type: SoundType) => {
    playSound(type);
    toast.info(`Testing: ${type.replace(/_/g, " ")}`);
  }, [playSound]);

  const handleResetDefaults = useCallback(() => {
    if (isLocked) {
      toast.error("Panel is locked");
      return;
    }
    setConfig({
      autoSpawn: true,
      aggressiveMode: false,
      stealthMode: true,
      ddosProtection: true,
      layer4Protection: true,
      rootkitScanning: true,
    });
    setSpawnRate([50]);
    setThreatSensitivity([75]);
    playSound("threat_mitigated");
    toast.success("Settings reset to defaults");
  }, [isLocked, playSound]);

  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Hydra Control Panel
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsLocked(!isLocked)}
            >
              {isLocked ? (
                <Lock className="h-4 w-4 text-red-400" />
              ) : (
                <Unlock className="h-4 w-4 text-green-400" />
              )}
            </Button>
            <Badge variant={isLocked ? "destructive" : "default"} className="text-xs">
              {isLocked ? "Locked" : "Unlocked"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Node Controls */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Node Management
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSpawnNode}
              disabled={isLocked}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Spawn Node
            </Button>
            <Button
              onClick={handleDestroyNode}
              disabled={isLocked}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Destroy Node
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spawn Rate</span>
              <span className="font-mono">{spawnRate[0]}%</span>
            </div>
            <Slider
              value={spawnRate}
              onValueChange={setSpawnRate}
              max={100}
              step={5}
              disabled={isLocked}
              className="w-full"
            />
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Defense Configuration */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Defense Configuration
          </h4>
          
          <div className="space-y-3">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) =>
                    handleConfigChange(key as keyof DefenseConfig, checked)
                  }
                  disabled={isLocked}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Threat Sensitivity</span>
              <span className="font-mono">{threatSensitivity[0]}%</span>
            </div>
            <Slider
              value={threatSensitivity}
              onValueChange={setThreatSensitivity}
              max={100}
              step={5}
              disabled={isLocked}
              className="w-full"
            />
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Sound Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            Audio Alerts
          </h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sound Effects</span>
            <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestAlert("attack_detected")}
              disabled={!soundEnabled}
              className="text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Test Attack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestAlert("node_spawned")}
              disabled={!soundEnabled}
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Test Spawn
            </Button>
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            disabled={isLocked}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HydraAdminPanel;
