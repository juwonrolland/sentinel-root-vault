import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Shield,
  Lock,
  Fingerprint,
  Smartphone,
  Key,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  sessionTimeout: number;
  notifyNewLogin: boolean;
  notifySuspiciousActivity: boolean;
  blockSuspiciousIPs: boolean;
  requirePasswordChange: number; // days
}

export const EnhancedAuthSecurity = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>(() => {
    const saved = localStorage.getItem('auth-security-settings');
    return saved ? JSON.parse(saved) : {
      twoFactorEnabled: false,
      biometricEnabled: false,
      sessionTimeout: 30,
      notifyNewLogin: true,
      notifySuspiciousActivity: true,
      blockSuspiciousIPs: true,
      requirePasswordChange: 90
    };
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);

  useEffect(() => {
    loadSessions();
    calculateSecurityScore();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('auth-security-settings', JSON.stringify(settings));
  }, [settings]);

  const loadSessions = async () => {
    // Simulate active sessions (in production, fetch from active_sessions table)
    const mockSessions: ActiveSession[] = [
      {
        id: '1',
        device: 'Chrome on Windows',
        location: 'Lagos, Nigeria',
        ip: '102.89.68.***',
        lastActive: 'Now',
        isCurrent: true
      },
      {
        id: '2',
        device: 'Safari on iPhone',
        location: 'Lagos, Nigeria',
        ip: '102.89.68.***',
        lastActive: '2 hours ago',
        isCurrent: false
      }
    ];
    setSessions(mockSessions);
  };

  const calculateSecurityScore = () => {
    let score = 40; // Base score
    if (settings.twoFactorEnabled) score += 20;
    if (settings.biometricEnabled) score += 15;
    if (settings.notifyNewLogin) score += 5;
    if (settings.notifySuspiciousActivity) score += 5;
    if (settings.blockSuspiciousIPs) score += 10;
    if (settings.sessionTimeout <= 30) score += 5;
    setSecurityScore(Math.min(100, score));
  };

  const updateSetting = (key: keyof SecuritySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Security setting updated');
  };

  const terminateSession = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Session terminated');
  };

  const terminateAllSessions = async () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    toast.success('All other sessions terminated');
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = () => {
    if (securityScore >= 80) return 'text-green-400';
    if (securityScore >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = () => {
    if (securityScore >= 80) return 'Strong';
    if (securityScore >= 60) return 'Moderate';
    return 'Weak';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Security Score */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-primary/20 border border-primary/30">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Account Security</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Manage your authentication and security settings</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className={`text-3xl sm:text-4xl font-bold ${getScoreColor()}`}>{securityScore}%</div>
              <Badge className={securityScore >= 80 ? 'bg-green-500/20 text-green-400' : securityScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>
                {getScoreLabel()} Security
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Security Settings */}
        <Card className="cyber-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure authentication and security options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add extra security layer</p>
                </div>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(v) => updateSetting('twoFactorEnabled', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Biometric Login</p>
                  <p className="text-xs text-muted-foreground">Face ID / Fingerprint</p>
                </div>
              </div>
              <Switch
                checked={settings.biometricEnabled}
                onCheckedChange={(v) => updateSetting('biometricEnabled', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium">Block Suspicious IPs</p>
                  <p className="text-xs text-muted-foreground">Auto-block risky logins</p>
                </div>
              </div>
              <Switch
                checked={settings.blockSuspiciousIPs}
                onCheckedChange={(v) => updateSetting('blockSuspiciousIPs', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-info" />
                <div>
                  <p className="text-sm font-medium">Session Timeout</p>
                  <p className="text-xs text-muted-foreground">{settings.sessionTimeout} minutes</p>
                </div>
              </div>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 30)}
                className="w-20 text-center"
                min={5}
                max={120}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="cyber-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Active Sessions
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage your logged-in devices
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={terminateAllSessions}
                className="text-xs"
              >
                <LogOut className="h-3 w-3 mr-1" />
                End All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border ${
                      session.isCurrent 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-secondary/30 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span className="font-medium text-sm">{session.device}</span>
                          {session.isCurrent && (
                            <Badge className="bg-success/20 text-success text-[10px]">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                          <span className="opacity-50">•</span>
                          <span className="font-mono">{session.ip}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.lastActive}
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => terminateSession(session.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Password Change */}
      <Card className="cyber-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Key className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Password Management
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Update your password regularly for better security
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)}>
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-sm">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={changePassword} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Update Password
                </Button>
                <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
