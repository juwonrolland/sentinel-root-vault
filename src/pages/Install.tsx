import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Share, 
  PlusSquare,
  Chrome,
  Apple,
  Fingerprint,
  Wifi,
  WifiOff,
  Shield,
  ArrowLeft
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const haptic = useHapticFeedback();
  const navigate = useNavigate();

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
    
    // Check if already running as standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    haptic.mediumTap();
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        haptic.success();
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install prompt failed:', error);
      haptic.error();
    }
  };

  const features = [
    { icon: Fingerprint, title: "Biometric Login", description: "Secure fingerprint/Face ID authentication" },
    { icon: WifiOff, title: "Offline Access", description: "Access critical data without internet" },
    { icon: Shield, title: "Push Alerts", description: "Instant threat notifications" },
    { icon: Smartphone, title: "Native Experience", description: "Full-screen, fast, app-like feel" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto p-4 bg-primary/10 rounded-2xl border border-primary/30 w-fit">
            <img src={logo} alt="GGSIP" className="h-16 w-16 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">Install GGSIP</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Glorious Global Security Intelligence Platform
            </p>
          </div>
        </div>

        {/* Status Card */}
        {isStandalone ? (
          <Card className="cyber-card border-success/30 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-success">App Installed</p>
                <p className="text-xs text-muted-foreground">You're using the installed version</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Button (Chrome/Android) */}
            {deferredPrompt && (
              <Card className="cyber-card">
                <CardContent className="p-6">
                  <Button
                    onClick={handleInstall}
                    className="w-full h-14 text-lg bg-primary hover:bg-primary-light"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Install App
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Adds to your home screen for quick access
                  </p>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <Card className="cyber-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Apple className="h-5 w-5" />
                    Install on iOS
                  </CardTitle>
                  <CardDescription>Follow these steps to add to home screen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Share className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">1. Tap the Share button</p>
                      <p className="text-xs text-muted-foreground">In Safari's bottom toolbar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <PlusSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">2. Add to Home Screen</p>
                      <p className="text-xs text-muted-foreground">Scroll down and tap this option</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="p-2 bg-success/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">3. Tap Add</p>
                      <p className="text-xs text-muted-foreground">Confirm to install the app</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Chrome Instructions (fallback) */}
            {isAndroid && !deferredPrompt && (
              <Card className="cyber-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Chrome className="h-5 w-5" />
                    Install on Android
                  </CardTitle>
                  <CardDescription>Add to home screen via Chrome menu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    1. Tap the menu (⋮) in Chrome<br />
                    2. Select "Add to Home screen"<br />
                    3. Tap "Add" to confirm
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <Card className="cyber-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Monitor className="h-5 w-5" />
                    Install on Desktop
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Look for the install icon (⊕) in your browser's address bar, 
                    or use the browser menu to "Install app" or "Add to Home screen".
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <Card className="cyber-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <feature.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform Support */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Works on iOS Safari, Android Chrome, and desktop browsers</p>
          <p className="flex items-center justify-center gap-2">
            <Wifi className="h-3 w-3" />
            Progressive Web App with offline support
          </p>
        </div>
      </div>
    </div>
  );
};

export default Install;
