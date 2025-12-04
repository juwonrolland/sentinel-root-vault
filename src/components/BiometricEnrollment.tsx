import { Fingerprint, Check, X, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface BiometricEnrollmentProps {
  userId: string;
  email: string;
}

export const BiometricEnrollment = ({ userId, email }: BiometricEnrollmentProps) => {
  const { isSupported, isEnrolled, isAuthenticating, enrollBiometric, removeBiometric } = useBiometricAuth();
  const haptic = useHapticFeedback();
  const [open, setOpen] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleEnroll = async () => {
    haptic.mediumTap();
    const success = await enrollBiometric(email, userId);
    if (success) {
      haptic.success();
      setOpen(false);
    } else {
      haptic.error();
    }
  };

  const handleRemove = () => {
    haptic.warning();
    removeBiometric();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`border-primary/30 ${isEnrolled ? 'bg-success/10 border-success/30' : 'bg-primary/5'}`}
        >
          <Fingerprint className={`h-4 w-4 mr-2 ${isEnrolled ? 'text-success' : 'text-primary'}`} />
          {isEnrolled ? 'Biometric Enabled' : 'Enable Biometric'}
        </Button>
      </DialogTrigger>
      <DialogContent className="cyber-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </DialogTitle>
          <DialogDescription>
            Use fingerprint or Face ID for quick and secure sign-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Device support info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
            <Smartphone className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Supported Devices</p>
              <p className="text-muted-foreground text-xs mt-1">
                Touch ID, Face ID, Windows Hello, Android Fingerprint
              </p>
            </div>
          </div>

          {isEnrolled ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                <Check className="h-5 w-5 text-success" />
                <span className="text-sm text-success">Biometric authentication is enabled</span>
              </div>
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Biometric
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>By enabling biometric authentication:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Sign in instantly with your fingerprint or face</li>
                  <li>Your biometric data never leaves your device</li>
                  <li>Works even when offline</li>
                </ul>
              </div>
              <Button
                onClick={handleEnroll}
                disabled={isAuthenticating}
                className="w-full bg-primary hover:bg-primary-light"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Enable Biometric Login
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
