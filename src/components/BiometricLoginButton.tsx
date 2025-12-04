import { Fingerprint, Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface BiometricLoginButtonProps {
  onSuccess: (email: string) => void;
  className?: string;
}

export const BiometricLoginButton = ({ onSuccess, className }: BiometricLoginButtonProps) => {
  const { isSupported, isEnrolled, isAuthenticating, authenticateWithBiometric } = useBiometricAuth();
  const haptic = useHapticFeedback();

  if (!isSupported || !isEnrolled) {
    return null;
  }

  const handleBiometricLogin = async () => {
    haptic.mediumTap();
    const result = await authenticateWithBiometric();
    if (result) {
      haptic.success();
      onSuccess(result.email);
    } else {
      haptic.error();
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBiometricLogin}
      disabled={isAuthenticating}
      className={`w-full border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all ${className}`}
    >
      {isAuthenticating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <div className="relative mr-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <Scan className="h-5 w-5 text-primary/50 absolute inset-0 animate-pulse" />
          </div>
          Sign in with Biometrics
        </>
      )}
    </Button>
  );
};
