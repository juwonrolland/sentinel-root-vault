import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FolderOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Server,
  Router,
  Network,
  Shield,
  Monitor,
  Smartphone,
  Wifi,
  Cloud,
  Building2,
  Landmark,
  Factory,
  Hospital,
  GraduationCap,
  Edit,
  Check,
  X,
  Tag,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NetworkDevice {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  status: string;
  organization: string;
}

interface DeviceGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  devices: string[]; // Device IDs
  parentGroupId?: string;
  createdAt: string;
}

interface DeviceGroupManagerProps {
  className?: string;
  devices: NetworkDevice[];
  onDeviceGroupChange?: (groups: DeviceGroup[]) => void;
}

const GROUP_COLORS = [
  { name: 'Blue', value: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Green', value: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { name: 'Yellow', value: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Red', value: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Purple', value: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Cyan', value: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { name: 'Orange', value: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'Pink', value: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

const GROUP_ICONS = [
  { name: 'Folder', value: 'folder', icon: <FolderOpen className="h-4 w-4" /> },
  { name: 'Building', value: 'building', icon: <Building2 className="h-4 w-4" /> },
  { name: 'Server', value: 'server', icon: <Server className="h-4 w-4" /> },
  { name: 'Network', value: 'network', icon: <Network className="h-4 w-4" /> },
  { name: 'Shield', value: 'shield', icon: <Shield className="h-4 w-4" /> },
  { name: 'Landmark', value: 'landmark', icon: <Landmark className="h-4 w-4" /> },
  { name: 'Factory', value: 'factory', icon: <Factory className="h-4 w-4" /> },
  { name: 'Hospital', value: 'hospital', icon: <Hospital className="h-4 w-4" /> },
  { name: 'Education', value: 'education', icon: <GraduationCap className="h-4 w-4" /> },
  { name: 'Layers', value: 'layers', icon: <Layers className="h-4 w-4" /> },
];

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  server: <Server className="h-3.5 w-3.5" />,
  router: <Router className="h-3.5 w-3.5" />,
  switch: <Network className="h-3.5 w-3.5" />,
  firewall: <Shield className="h-3.5 w-3.5" />,
  workstation: <Monitor className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  iot: <Wifi className="h-3.5 w-3.5" />,
  cloud: <Cloud className="h-3.5 w-3.5" />,
};

const getGroupIcon = (iconValue: string) => {
  const found = GROUP_ICONS.find(i => i.value === iconValue);
  return found?.icon || <FolderOpen className="h-4 w-4" />;
};

export const DeviceGroupManager = ({ className, devices, onDeviceGroupChange }: DeviceGroupManagerProps) => {
  const [groups, setGroups] = useState<DeviceGroup[]>(() => {
    const saved = localStorage.getItem('device-groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [newGroup, setNewGroup] = useState<Partial<DeviceGroup>>({
    color: GROUP_COLORS[0].value,
    icon: 'folder',
    devices: [],
  });
  const { toast } = useToast();

  // Save groups to localStorage
  useEffect(() => {
    localStorage.setItem('device-groups', JSON.stringify(groups));
    onDeviceGroupChange?.(groups);
  }, [groups, onDeviceGroupChange]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const createGroup = () => {
    if (!newGroup.name) {
      toast({
        title: "Validation Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    const group: DeviceGroup = {
      id: `group-${Date.now()}`,
      name: newGroup.name!,
      description: newGroup.description || '',
      color: newGroup.color!,
      icon: newGroup.icon!,
      devices: Array.from(selectedDevices),
      parentGroupId: newGroup.parentGroupId,
      createdAt: new Date().toISOString(),
    };

    setGroups(prev => [...prev, group]);
    setIsCreatingGroup(false);
    setSelectedDevices(new Set());
    setNewGroup({
      color: GROUP_COLORS[0].value,
      icon: 'folder',
      devices: [],
    });

    toast({
      title: "Group Created",
      description: `"${group.name}" with ${group.devices.length} devices`,
    });
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    toast({
      title: "Group Deleted",
      description: "Device group has been removed",
    });
  };

  const addDevicesToGroup = (groupId: string) => {
    if (selectedDevices.size === 0) {
      toast({
        title: "No Devices Selected",
        description: "Select devices to add to the group",
        variant: "destructive",
      });
      return;
    }

    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const newDevices = new Set([...g.devices, ...selectedDevices]);
        return { ...g, devices: Array.from(newDevices) };
      }
      return g;
    }));

    setSelectedDevices(new Set());
    toast({
      title: "Devices Added",
      description: `Added ${selectedDevices.size} devices to group`,
    });
  };

  const removeDeviceFromGroup = (groupId: string, deviceId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, devices: g.devices.filter(d => d !== deviceId) };
      }
      return g;
    }));
  };

  const getDeviceById = (deviceId: string) => {
    return devices.find(d => d.id === deviceId);
  };

  const getUngroupedDevices = () => {
    const groupedDeviceIds = new Set(groups.flatMap(g => g.devices));
    return devices.filter(d => !groupedDeviceIds.has(d.id));
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Device Groups
            <Badge variant="outline" className="ml-2">
              {groups.length} groups
            </Badge>
          </CardTitle>
          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Create Device Group
                </DialogTitle>
                <DialogDescription>
                  Organize devices into logical groups for easier management
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Group Name *</Label>
                    <Input
                      placeholder="e.g., Production Servers"
                      value={newGroup.name || ''}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Group</Label>
                    <Select
                      value={newGroup.parentGroupId || 'none'}
                      onValueChange={(v) => setNewGroup({ ...newGroup, parentGroupId: v === 'none' ? undefined : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Optional description"
                    value={newGroup.description || ''}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={newGroup.color}
                      onValueChange={(v) => setNewGroup({ ...newGroup, color: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_COLORS.map(c => (
                          <SelectItem key={c.name} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-4 h-4 rounded", c.value.split(' ')[0])} />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={newGroup.icon}
                      onValueChange={(v) => setNewGroup({ ...newGroup, icon: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_ICONS.map(i => (
                          <SelectItem key={i.value} value={i.value}>
                            <div className="flex items-center gap-2">
                              {i.icon}
                              {i.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Device Selection */}
                <div className="space-y-2">
                  <Label>Select Devices ({selectedDevices.size} selected)</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-2">
                    <div className="space-y-1">
                      {devices.map(device => (
                        <div
                          key={device.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                            selectedDevices.has(device.id) 
                              ? "bg-primary/20 border border-primary/30" 
                              : "hover:bg-secondary/50"
                          )}
                          onClick={() => toggleDeviceSelection(device.id)}
                        >
                          <Checkbox
                            checked={selectedDevices.has(device.id)}
                            onCheckedChange={() => toggleDeviceSelection(device.id)}
                          />
                          {DEVICE_ICONS[device.type] || <Network className="h-3.5 w-3.5" />}
                          <span className="text-sm flex-1">{device.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{device.ipAddress}</span>
                        </div>
                      ))}
                      {devices.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No devices available
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => {
                    setIsCreatingGroup(false);
                    setSelectedDevices(new Set());
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={createGroup}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No device groups created</p>
              <p className="text-sm">Create groups to organize your network devices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.filter(g => !g.parentGroupId).map((group) => (
                <Collapsible
                  key={group.id}
                  open={expandedGroups.has(group.id)}
                  onOpenChange={() => toggleGroupExpand(group.id)}
                >
                  <div className={cn(
                    "rounded-lg border transition-all",
                    group.color
                  )}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5">
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(group.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {getGroupIcon(group.icon)}
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.devices.length} devices
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        {group.description && (
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        )}
                        <div className="space-y-1">
                          {group.devices.map(deviceId => {
                            const device = getDeviceById(deviceId);
                            if (!device) return null;
                            return (
                              <div
                                key={deviceId}
                                className="flex items-center justify-between p-2 rounded bg-background/50"
                              >
                                <div className="flex items-center gap-2">
                                  {DEVICE_ICONS[device.type] || <Network className="h-3.5 w-3.5" />}
                                  <span className="text-sm">{device.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {device.ipAddress}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeDeviceFromGroup(group.id, deviceId)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                          {group.devices.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No devices in this group
                            </p>
                          )}
                        </div>
                        
                        {/* Sub-groups */}
                        {groups.filter(g => g.parentGroupId === group.id).map(subGroup => (
                          <div key={subGroup.id} className={cn("ml-4 rounded-lg border", subGroup.color)}>
                            <div className="flex items-center justify-between p-2">
                              <div className="flex items-center gap-2">
                                {getGroupIcon(subGroup.icon)}
                                <span className="text-sm font-medium">{subGroup.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {subGroup.devices.length}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteGroup(subGroup.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Ungrouped Devices */}
          {getUngroupedDevices().length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Ungrouped Devices ({getUngroupedDevices().length})
              </p>
              <div className="space-y-1">
                {getUngroupedDevices().slice(0, 5).map(device => (
                  <div
                    key={device.id}
                    className="flex items-center gap-2 p-2 rounded bg-secondary/30 text-sm"
                  >
                    {DEVICE_ICONS[device.type] || <Network className="h-3.5 w-3.5" />}
                    <span>{device.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{device.ipAddress}</span>
                  </div>
                ))}
                {getUngroupedDevices().length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{getUngroupedDevices().length - 5} more ungrouped devices
                  </p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DeviceGroupManager;
