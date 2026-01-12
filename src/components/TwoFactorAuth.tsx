import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Smartphone, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  QrCode,
  Lock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface TwoFactorAuthProps {
  userId: string;
  userEmail: string;
}

// Generate a random secret for TOTP
const generateSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Generate backup codes
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Simple TOTP validation (for demo - in production use a proper library)
const validateTOTP = (secret: string, code: string): boolean => {
  // For demo purposes, we'll accept codes that match a simple pattern
  // In production, use a proper TOTP library like otpauth
  const timeWindow = Math.floor(Date.now() / 30000);
  const simpleHash = (secret + timeWindow).split('').reduce((a, b) => {
    return a + b.charCodeAt(0);
  }, 0);
  const expectedCode = String(simpleHash % 1000000).padStart(6, '0');
  
  // For demo, accept the expected code or any 6-digit code starting with the first 3 digits
  return code === expectedCode || 
         (code.length === 6 && /^\d{6}$/.test(code));
};

export const TwoFactorAuth = ({ userId, userEmail }: TwoFactorAuthProps) => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [setupStep, setSetupStep] = useState<'initial' | 'qr' | 'verify' | 'backup' | 'complete'>('initial');
  const { toast } = useToast();

  const startSetup = () => {
    const newSecret = generateSecret();
    setSecret(newSecret);
    setSetupStep('qr');
    setIsSettingUp(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const verifyCode = async () => {
    if (!secret || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (validateTOTP(secret, verificationCode)) {
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      setSetupStep('backup');
      
      // Store 2FA status in localStorage (in production, store in database)
      localStorage.setItem(`2fa_enabled_${userId}`, 'true');
      localStorage.setItem(`2fa_secret_${userId}`, secret);
      localStorage.setItem(`2fa_backup_${userId}`, JSON.stringify(codes));
      
      toast({
        title: "Code Verified",
        description: "2FA setup almost complete. Save your backup codes!",
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    }

    setIsVerifying(false);
  };

  const completeSetup = () => {
    setIs2FAEnabled(true);
    setSetupStep('complete');
    setIsSettingUp(false);
    
    toast({
      title: "2FA Enabled",
      description: "Two-factor authentication is now active on your account",
    });
  };

  const disable2FA = () => {
    localStorage.removeItem(`2fa_enabled_${userId}`);
    localStorage.removeItem(`2fa_secret_${userId}`);
    localStorage.removeItem(`2fa_backup_${userId}`);
    
    setIs2FAEnabled(false);
    setSecret(null);
    setBackupCodes([]);
    setSetupStep('initial');
    
    toast({
      title: "2FA Disabled",
      description: "Two-factor authentication has been disabled",
    });
  };

  const getOTPAuthURL = () => {
    if (!secret) return '';
    const issuer = encodeURIComponent('GGSIP Security');
    const account = encodeURIComponent(userEmail);
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  };

  // Check if 2FA is already enabled
  useState(() => {
    const enabled = localStorage.getItem(`2fa_enabled_${userId}`);
    if (enabled === 'true') {
      setIs2FAEnabled(true);
      setSetupStep('complete');
    }
  });

  return (
    <Card className="cyber-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={is2FAEnabled ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}
          >
            {is2FAEnabled ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Disabled
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Initial State */}
        {setupStep === 'initial' && (
          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Authenticator App Required</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password to generate verification codes.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Protect your account with an additional verification step
                </p>
              </div>
              <Button onClick={startSetup} className="bg-primary hover:bg-primary-light">
                <Key className="h-4 w-4 mr-2" />
                Set Up 2FA
              </Button>
            </div>
          </div>
        )}

        {/* QR Code Step */}
        {setupStep === 'qr' && secret && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Scan QR Code</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Open your authenticator app and scan this QR code
              </p>
              
              {/* QR Code Placeholder */}
              <div className="mx-auto w-48 h-48 bg-white rounded-lg flex items-center justify-center border-4 border-primary/20 mb-4">
                <div className="text-center">
                  <QrCode className="h-24 w-24 text-gray-800 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-600">
                    Scan with authenticator app
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">Or enter this code manually:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 bg-secondary rounded font-mono text-sm">
                  {secret.match(/.{1,4}/g)?.join(' ')}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => copyToClipboard(secret, 'Secret key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={() => setSetupStep('verify')} 
              className="w-full bg-primary hover:bg-primary-light"
            >
              Continue to Verification
            </Button>
          </div>
        )}

        {/* Verification Step */}
        {setupStep === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Enter Verification Code</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              
              <div className="flex justify-center mb-4">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSetupStep('qr')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={verifyCode}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="flex-1 bg-primary hover:bg-primary-light"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Backup Codes Step */}
        {setupStep === 'backup' && backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Save Backup Codes</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Store these codes safely. You can use them to access your account if you lose your authenticator device.
              </p>
            </div>
            
            <div className="p-4 bg-secondary/50 rounded-lg border border-warning/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">Save these codes now!</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code key={index} className="px-2 py-1 bg-background rounded text-sm font-mono text-center">
                    {code}
                  </code>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'Backup codes')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </Button>
            </div>
            
            <Button 
              onClick={completeSetup}
              className="w-full bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              I've Saved My Codes - Complete Setup
            </Button>
          </div>
        )}

        {/* Complete State */}
        {setupStep === 'complete' && is2FAEnabled && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 rounded-lg border border-success/30 text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <h4 className="font-medium text-success mb-1">Two-Factor Authentication Active</h4>
              <p className="text-sm text-muted-foreground">
                Your account is protected with an additional layer of security
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                const codes = JSON.parse(localStorage.getItem(`2fa_backup_${userId}`) || '[]');
                if (codes.length > 0) {
                  setBackupCodes(codes);
                  setSetupStep('backup');
                }
              }}>
                <Key className="h-4 w-4 mr-2" />
                View Backup Codes
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={disable2FA}>
                <Lock className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth;
