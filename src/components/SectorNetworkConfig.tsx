import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Network,
  Server,
  Router,
  Shield,
  Database,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  AlertTriangle,
  Globe,
  Wifi,
  Monitor,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface NetworkAsset {
  id: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'database' | 'endpoint' | 'cloud' | 'iot';
  ipAddress: string;
  subnet?: string;
  gateway?: string;
  dnsServers?: string[];
  port?: number;
  description?: string;
  status: 'active' | 'inactive' | 'monitoring';
  addedAt: string;
}

interface SectorConfig {
  sectorId: string;
  sectorName: string;
  assets: NetworkAsset[];
  primaryContact?: string;
  contactEmail?: string;
  networkRange?: string;
  vlanId?: string;
  notes?: string;
}

interface SectorNetworkConfigProps {
  sectorId: string;
  sectorName: string;
  sectorIcon?: React.ReactNode;
  onConfigUpdate?: (config: SectorConfig) => void;
}

const ASSET_TYPES = [
  { value: 'server', label: 'Server', icon: <Server className="h-4 w-4" /> },
  { value: 'router', label: 'Router', icon: <Router className="h-4 w-4" /> },
  { value: 'switch', label: 'Switch', icon: <Network className="h-4 w-4" /> },
  { value: 'firewall', label: 'Firewall', icon: <Shield className="h-4 w-4" /> },
  { value: 'database', label: 'Database', icon: <Database className="h-4 w-4" /> },
  { value: 'endpoint', label: 'Endpoint', icon: <Monitor className="h-4 w-4" /> },
  { value: 'cloud', label: 'Cloud Instance', icon: <Globe className="h-4 w-4" /> },
  { value: 'iot', label: 'IoT Device', icon: <Wifi className="h-4 w-4" /> },
];

export const SectorNetworkConfig: React.FC<SectorNetworkConfigProps> = ({
  sectorId,
  sectorName,
  sectorIcon,
  onConfigUpdate,
}) => {
  const [config, setConfig] = useState<SectorConfig>(() => {
    const saved = localStorage.getItem(`sector-config-${sectorId}`);
    return saved
      ? JSON.parse(saved)
      : {
          sectorId,
          sectorName,
          assets: [],
          primaryContact: '',
          contactEmail: '',
          networkRange: '',
          vlanId: '',
          notes: '',
        };
  });

  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<NetworkAsset | null>(null);
  const [newAsset, setNewAsset] = useState<Partial<NetworkAsset>>({
    type: 'server',
    status: 'monitoring',
  });

  useEffect(() => {
    localStorage.setItem(`sector-config-${sectorId}`, JSON.stringify(config));
    onConfigUpdate?.(config);
  }, [config, sectorId, onConfigUpdate]);

  const addAsset = () => {
    if (!newAsset.name || !newAsset.ipAddress) {
      toast.error('Name and IP address are required');
      return;
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newAsset.ipAddress)) {
      toast.error('Please enter a valid IPv4 address');
      return;
    }

    const asset: NetworkAsset = {
      id: `asset-${Date.now()}`,
      name: newAsset.name!,
      type: newAsset.type as any,
      ipAddress: newAsset.ipAddress!,
      subnet: newAsset.subnet,
      gateway: newAsset.gateway,
      port: newAsset.port,
      description: newAsset.description,
      status: 'monitoring',
      addedAt: new Date().toISOString(),
    };

    setConfig((prev) => ({
      ...prev,
      assets: [...prev.assets, asset],
    }));

    setNewAsset({ type: 'server', status: 'monitoring' });
    setIsAddingAsset(false);
    toast.success(`${asset.name} added for monitoring`);
  };

  const updateAsset = () => {
    if (!editingAsset) return;

    setConfig((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === editingAsset.id ? editingAsset : a
      ),
    }));

    setEditingAsset(null);
    toast.success('Asset updated');
  };

  const removeAsset = (assetId: string) => {
    setConfig((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
    toast.success('Asset removed');
  };

  const updateConfig = (key: keyof SectorConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const getAssetIcon = (type: string) => {
    return ASSET_TYPES.find((t) => t.value === type)?.icon || <Server className="h-4 w-4" />;
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sectorIcon || <Network className="h-5 w-5 text-primary" />}
            <div>
              <CardTitle className="text-sm sm:text-base">{sectorName} Network Configuration</CardTitle>
              <CardDescription className="text-xs">
                Configure network assets for monitoring
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            {config.assets.length} Assets
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Range Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Network Range (CIDR)</Label>
            <Input
              placeholder="e.g., 10.0.0.0/24"
              value={config.networkRange || ''}
              onChange={(e) => updateConfig('networkRange', e.target.value)}
              className="text-xs h-8 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VLAN ID</Label>
            <Input
              placeholder="e.g., 100"
              value={config.vlanId || ''}
              onChange={(e) => updateConfig('vlanId', e.target.value)}
              className="text-xs h-8 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Primary Contact</Label>
            <Input
              placeholder="Contact name"
              value={config.primaryContact || ''}
              onChange={(e) => updateConfig('primaryContact', e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Asset List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Network Assets</Label>
            <Dialog open={isAddingAsset} onOpenChange={setIsAddingAsset}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Network className="h-4 w-4 text-primary" />
                    Add Network Asset
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Add a device to monitor in {sectorName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Asset Name *</Label>
                      <Input
                        placeholder="e.g., Main Server"
                        value={newAsset.name || ''}
                        onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type *</Label>
                      <Select
                        value={newAsset.type}
                        onValueChange={(v: any) => setNewAsset({ ...newAsset, type: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                {type.icon} {type.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">IP Address *</Label>
                      <Input
                        placeholder="e.g., 192.168.1.100"
                        value={newAsset.ipAddress || ''}
                        onChange={(e) => setNewAsset({ ...newAsset, ipAddress: e.target.value })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 22"
                        value={newAsset.port || ''}
                        onChange={(e) => setNewAsset({ ...newAsset, port: parseInt(e.target.value) || undefined })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Subnet</Label>
                      <Input
                        placeholder="e.g., 255.255.255.0"
                        value={newAsset.subnet || ''}
                        onChange={(e) => setNewAsset({ ...newAsset, subnet: e.target.value })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Gateway</Label>
                      <Input
                        placeholder="e.g., 192.168.1.1"
                        value={newAsset.gateway || ''}
                        onChange={(e) => setNewAsset({ ...newAsset, gateway: e.target.value })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      placeholder="Optional description..."
                      value={newAsset.description || ''}
                      onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingAsset(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addAsset}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Asset
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-2">
              {config.assets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No network assets configured</p>
                  <p className="text-[10px]">Add devices to start monitoring</p>
                </div>
              ) : (
                config.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded bg-primary/10">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {asset.ipAddress}
                          {asset.port && `:${asset.port}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[8px] ${
                          asset.status === 'active'
                            ? 'bg-success/10 text-success border-success/30'
                            : asset.status === 'monitoring'
                            ? 'bg-info/10 text-info border-info/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {asset.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingAsset(asset)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeAsset(asset.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            placeholder="Additional notes about this sector's network..."
            value={config.notes || ''}
            onChange={(e) => updateConfig('notes', e.target.value)}
            className="text-xs min-h-[60px]"
          />
        </div>
      </CardContent>

      {/* Edit Asset Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-primary" />
              Edit Asset
            </DialogTitle>
          </DialogHeader>
          {editingAsset && (
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Asset Name</Label>
                  <Input
                    value={editingAsset.name}
                    onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">IP Address</Label>
                  <Input
                    value={editingAsset.ipAddress}
                    onChange={(e) => setEditingAsset({ ...editingAsset, ipAddress: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingAsset(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={updateAsset}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SectorNetworkConfig;
