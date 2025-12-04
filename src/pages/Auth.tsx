import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, User, Mail, KeyRound, Eye, EyeOff, Loader2, Fingerprint } from "lucide-react";
import logo from "@/assets/logo.png";
import { BiometricLoginButton } from "@/components/BiometricLoginButton";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSupported, isEnrolled, enrollBiometric, isAuthenticating } = useBiometricAuth();

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Access Granted",
        description: "Account created successfully. You can now sign in.",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Access Granted",
        description: "Welcome to the Security Intelligence Platform",
      });
      
      // Prompt for biometric enrollment if supported and not enrolled
      if (isSupported && !isEnrolled && data.user) {
        setCurrentUserId(data.user.id);
        setShowEnrollPrompt(true);
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleBiometricSuccess = async (biometricEmail: string) => {
    setEmail(biometricEmail);
    toast({
      title: "Biometric Verified",
      description: "Please enter your password to complete sign in",
    });
  };

  const handleEnrollBiometric = async () => {
    if (currentUserId && email) {
      const success = await enrollBiometric(email, currentUserId);
      if (success) {
        navigate("/dashboard");
      }
    }
    setShowEnrollPrompt(false);
  };

  const skipEnrollment = () => {
    setShowEnrollPrompt(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 cyber-grid opacity-30" />
      
      {/* Gradient orbs - smaller on mobile */}
      <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating particles - hide some on mobile */}
      {particles.slice(0, 10).map((particle, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float hidden sm:block"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
      </div>

      <Card className="w-full max-w-[95vw] sm:max-w-md cyber-card backdrop-blur-xl animate-scale-in relative z-10">
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <CardHeader className="text-center space-y-4 sm:space-y-6 pt-6 sm:pt-8 px-4 sm:px-6">
          {/* Logo container */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="relative">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse scale-125" />
              {/* Inner glow */}
              <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full border border-primary/30 shadow-glow">
                <img 
                  src={logo} 
                  alt="GGSIP Logo" 
                  className="h-12 w-12 sm:h-16 sm:w-16 object-contain" 
                />
              </div>
              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-success rounded-full border-2 border-background animate-pulse" />
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gradient tracking-tight">
                GLORIOUS GLOBAL SECURITY
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-muted-foreground tracking-widest">
                INTELLIGENCE PLATFORM
              </p>
            </div>
          </div>
          
          <CardDescription className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            <span>Secure Authentication Required</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-6 sm:pb-8 px-4 sm:px-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <User className="h-4 w-4 mr-2" />
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="operator@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-signin"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-semibold transition-all hover:shadow-glow" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Access System
                    </>
                  )}
                </Button>
                
                {/* Biometric Login Option */}
                {isSupported && isEnrolled && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/30" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>
                    <BiometricLoginButton onSuccess={handleBiometricSuccess} />
                  </>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="Agent Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="operator@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-signup"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-semibold transition-all hover:shadow-glow" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-xs text-center text-muted-foreground font-mono">
              <Lock className="inline h-3 w-3 mr-1" />
              256-BIT AES ENCRYPTED // SECURE CONNECTION
            </p>
          </div>
        </CardContent>
        
        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      </Card>

      {/* Biometric Enrollment Prompt */}
      {showEnrollPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="cyber-card max-w-md w-full animate-scale-in">
            <CardHeader className="text-center">
              <div className="mx-auto p-4 bg-primary/10 rounded-full border border-primary/30 mb-4">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gradient">Enable Biometric Login?</h2>
              <CardDescription>
                Use fingerprint or Face ID for faster, secure sign-in next time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2 p-3 bg-secondary/50 rounded-lg border border-border/30">
                <p className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-success" />
                  Your biometric data never leaves your device
                </p>
                <p className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-success" />
                  Works offline for instant access
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={skipEnrollment}
                  className="flex-1 border-border/50"
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleEnrollBiometric}
                  disabled={isAuthenticating}
                  className="flex-1 bg-primary hover:bg-primary-light"
                >
                  {isAuthenticating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;
