import { useState } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Globe,
  Network,
  Shield,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Building2,
  Landmark,
  Heart,
  Factory,
  GraduationCap,
  Banknote,
  Lock,
  Eye,
  RefreshCw,
  Server,
  Activity,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRegisteredNetworks, RegisteredNetwork } from '@/hooks/useRegisteredNetworks';
import { useRoleAccess } from '@/hooks/useRoleAccess';

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  government: <Landmark className="h-4 w-4" />,
  financial: <Banknote className="h-4 w-4" />,
  healthcare: <Heart className="h-4 w-4" />,
  corporate: <Building2 className="h-4 w-4" />,
  infrastructure: <Factory className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  defense: <Shield className="h-4 w-4" />,
};

const SECURITY_LEVELS = [
  { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
  { value: 'elevated', label: 'Elevated', color: 'bg-yellow-500' },
  { value: 'classified', label: 'Classified', color: 'bg-orange-500' },
  { value: 'top-secret', label: 'Top Secret', color: 'bg-red-500' },
];

interface GlobalNetworkRegistryProps {
  onNetworkSelect?: (network: RegisteredNetwork) => void;
}

export const GlobalNetworkRegistry: React.FC<GlobalNetworkRegistryProps> = ({ onNetworkSelect }) => {
  const { 
    networks, 
    registerNetwork, 
    removeNetwork, 
    verifyNetwork, 
    getSecurityStats 
  } = useRegisteredNetworks();
  const { isAdmin, isAnalyst } = useRoleAccess();
  const [isRegistering, setIsRegistering] = useState(false);
  const [newNetwork, setNewNetwork] = useState({
    name: '',
    networkRange: '',
    vlanId: '',
    gateway: '',
    sector: 'corporate',
    contactPerson: '',
    contactEmail: '',
    location: '',
    securityLevel: 'standard' as const,
    complianceFrameworks: [] as string[],
  });

  const stats = getSecurityStats();

  const handleRegister = async () => {
    if (!newNetwork.name || !newNetwork.networkRange || !newNetwork.gateway) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate network range format (CIDR)
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(newNetwork.networkRange)) {
      toast.error('Invalid network range format. Use CIDR notation (e.g., 192.168.1.0/24)');
      return;
    }

    // Validate gateway IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newNetwork.gateway)) {
      toast.error('Invalid gateway IP address');
      return;
    }

    try {
      await registerNetwork({
        name: newNetwork.name,
        networkRange: newNetwork.networkRange,
        vlanId: newNetwork.vlanId || undefined,
        gateway: newNetwork.gateway,
        sector: newNetwork.sector,
        registeredBy: 'current-user', // Would be auth.uid() in production
        status: 'pending',
        metadata: {
          contactPerson: newNetwork.contactPerson || undefined,
          contactEmail: newNetwork.contactEmail || undefined,
          location: newNetwork.location || undefined,
          securityLevel: newNetwork.securityLevel,
          complianceFrameworks: newNetwork.complianceFrameworks,
        },
      });

      toast.success('Network registered successfully. Awaiting verification.');
      setIsRegistering(false);
      setNewNetwork({
        name: '',
        networkRange: '',
        vlanId: '',
        gateway: '',
        sector: 'corporate',
        contactPerson: '',
        contactEmail: '',
        location: '',
        securityLevel: 'standard',
        complianceFrameworks: [],
      });
    } catch (error) {
      toast.error('Failed to register network');
    }
  };

  const handleVerify = async (networkId: string) => {
    await verifyNetwork(networkId);
    toast.success('Network verified and activated');
  };

  const handleRemove = async (networkId: string) => {
    await removeNetwork(networkId);
    toast.success('Network removed from registry');
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (status === 'active' && isVerified) {
      return <Badge className="bg-success/20 text-success border-success/30">Verified & Active</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Verification</Badge>;
    }
    if (status === 'suspended') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspended</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm sm:text-base">Global Network Registry</CardTitle>
              <CardDescription className="text-xs">
                Register and manage protected network infrastructures
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10">
              {networks.length} Networks
            </Badge>
            {(isAdmin || isAnalyst) && (
              <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Register Network
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Network className="h-5 w-5 text-primary" />
                      Register Network Infrastructure
                    </DialogTitle>
                    <DialogDescription>
                      Register your network for enterprise-grade security monitoring
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Network Name *</Label>
                        <Input
                          placeholder="e.g., Corporate HQ Network"
                          value={newNetwork.name}
                          onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sector *</Label>
                        <Select
                          value={newNetwork.sector}
                          onValueChange={(v) => setNewNetwork({ ...newNetwork, sector: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corporate">Corporate</SelectItem>
                            <SelectItem value="government">Government</SelectItem>
                            <SelectItem value="financial">Financial</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="infrastructure">Infrastructure</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="defense">Defense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Network Range (CIDR) *</Label>
                        <Input
                          placeholder="e.g., 192.168.1.0/24"
                          value={newNetwork.networkRange}
                          onChange={(e) => setNewNetwork({ ...newNetwork, networkRange: e.target.value })}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Gateway IP *</Label>
                        <Input
                          placeholder="e.g., 192.168.1.1"
                          value={newNetwork.gateway}
                          onChange={(e) => setNewNetwork({ ...newNetwork, gateway: e.target.value })}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">VLAN ID</Label>
                        <Input
                          placeholder="e.g., 100"
                          value={newNetwork.vlanId}
                          onChange={(e) => setNewNetwork({ ...newNetwork, vlanId: e.target.value })}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Security Level</Label>
                        <Select
                          value={newNetwork.securityLevel}
                          onValueChange={(v: any) => setNewNetwork({ ...newNetwork, securityLevel: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECURITY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                <span className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${level.color}`} />
                                  {level.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Contact Person</Label>
                        <Input
                          placeholder="Network Administrator"
                          value={newNetwork.contactPerson}
                          onChange={(e) => setNewNetwork({ ...newNetwork, contactPerson: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Contact Email</Label>
                        <Input
                          type="email"
                          placeholder="admin@company.com"
                          value={newNetwork.contactEmail}
                          onChange={(e) => setNewNetwork({ ...newNetwork, contactEmail: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Location</Label>
                      <Input
                        placeholder="e.g., New York Data Center"
                        value={newNetwork.location}
                        onChange={(e) => setNewNetwork({ ...newNetwork, location: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setIsRegistering(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleRegister}>
                        <Shield className="h-3 w-3 mr-1" />
                        Register Network
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-lg font-bold text-primary">{stats.activeNetworks}</p>
            <p className="text-[10px] text-muted-foreground">Active Networks</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-lg font-bold text-success">{stats.verifiedNetworks}</p>
            <p className="text-[10px] text-muted-foreground">Verified</p>
          </div>
          <div className="p-2 rounded-lg bg-info/10 border border-info/20 text-center">
            <p className="text-lg font-bold text-info">{stats.totalDevices}</p>
            <p className="text-[10px] text-muted-foreground">Total Devices</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-lg font-bold text-destructive">{stats.threats}</p>
            <p className="text-[10px] text-muted-foreground">Active Threats</p>
          </div>
        </div>

        {/* Network List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {networks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-2">No networks registered</p>
                <p className="text-xs">Register your network infrastructure for security monitoring</p>
              </div>
            ) : (
              networks.map((network) => (
                <div
                  key={network.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => onNetworkSelect?.(network)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-primary/10">
                        {SECTOR_ICONS[network.sector] || <Network className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{network.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{network.networkRange}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(network.status, network.isVerified)}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                    <div>
                      <p className="text-muted-foreground">Sector</p>
                      <p className="capitalize">{network.sector}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Devices</p>
                      <p>{network.devices.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gateway</p>
                      <p className="font-mono">{network.gateway}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Security</p>
                      <p className="capitalize">{network.metadata.securityLevel}</p>
                    </div>
                  </div>

                  {(isAdmin || isAnalyst) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      {!network.isVerified && network.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); handleVerify(network.id); }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-[10px]"
                        onClick={(e) => { e.stopPropagation(); onNetworkSelect?.(network); }}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-[10px] text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Network?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {network.name} and all associated devices from monitoring. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(network.id)}>
                              Remove Network
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
