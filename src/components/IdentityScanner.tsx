import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  Upload,
  ScanFace,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Shield,
  Fingerprint,
  MapPin,
  Clock,
  FileText,
  Search,
  UserX,
  UserCheck,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Download,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface IdentityResult {
  id: string;
  timestamp: string;
  imageUrl: string;
  status: 'identified' | 'unknown' | 'flagged' | 'processing';
  confidence: number;
  facesDetected: number;
  identityInfo?: {
    name?: string;
    alias?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    lastSeen?: string;
    location?: string;
    associatedIPs?: string[];
    threatHistory?: string[];
    biometricMatch?: number;
  };
  metadata: {
    processingTime: number;
    modelUsed: string;
    imageQuality: number;
    facialFeatures?: {
      age?: string;
      gender?: string;
      emotion?: string;
    };
  };
}

interface IdentityScannerProps {
  className?: string;
  onIdentityDetected?: (result: IdentityResult) => void;
}

export const IdentityScanner: React.FC<IdentityScannerProps> = ({
  className,
  onIdentityDetected,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [scanResults, setScanResults] = useState<IdentityResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<IdentityResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [realtimeMonitoring, setRealtimeMonitoring] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Real-time monitoring simulation
  useEffect(() => {
    if (!realtimeMonitoring) return;

    const interval = setInterval(() => {
      // Simulate detecting faces from security feeds
      const shouldDetect = Math.random() > 0.7;
      if (shouldDetect) {
        const simulatedResult = generateSimulatedResult();
        setScanResults(prev => [simulatedResult, ...prev.slice(0, 19)]);
        
        if (simulatedResult.status === 'flagged') {
          toast.error('Flagged Individual Detected', {
            description: `High-risk individual detected at ${simulatedResult.identityInfo?.location || 'Unknown location'}`,
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realtimeMonitoring]);

  const generateSimulatedResult = (): IdentityResult => {
    const statuses: IdentityResult['status'][] = ['identified', 'unknown', 'flagged'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    
    return {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      imageUrl: '',
      status,
      confidence: Math.random() * 40 + 60,
      facesDetected: Math.floor(Math.random() * 3) + 1,
      identityInfo: status !== 'unknown' ? {
        name: status === 'flagged' ? 'Unknown Subject' : ['John Doe', 'Jane Smith', 'Alex Johnson'][Math.floor(Math.random() * 3)],
        alias: status === 'flagged' ? 'Threat Actor #' + Math.floor(Math.random() * 1000) : undefined,
        riskLevel: status === 'flagged' ? riskLevels[2 + Math.floor(Math.random() * 2)] : riskLevels[Math.floor(Math.random() * 2)],
        lastSeen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        location: ['Main Entrance', 'Server Room', 'Parking Lot', 'Office Floor 3'][Math.floor(Math.random() * 4)],
        associatedIPs: status === 'flagged' ? [`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`] : [],
        threatHistory: status === 'flagged' ? ['Unauthorized access attempt', 'Suspicious behavior detected'] : [],
        biometricMatch: Math.random() * 20 + 80,
      } : undefined,
      metadata: {
        processingTime: Math.floor(Math.random() * 2000) + 500,
        modelUsed: 'FaceNet + ResNet-50',
        imageQuality: Math.random() * 30 + 70,
        facialFeatures: {
          age: ['20-30', '30-40', '40-50', '50-60'][Math.floor(Math.random() * 4)],
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          emotion: ['Neutral', 'Focused', 'Alert', 'Suspicious'][Math.floor(Math.random() * 4)],
        },
      },
    };
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        toast.success('Camera activated');
      }
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast.error('Camera access denied', {
        description: 'Please allow camera access to use facial recognition',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewImage(imageData);
    analyzeImage(imageData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please upload an image file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      if (autoScan) {
        analyzeImage(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageData: string) => {
    setIsScanning(true);
    setProgress(0);
    setCurrentStep('Initializing facial recognition...');

    const steps = [
      'Loading image data...',
      'Detecting faces...',
      'Extracting facial features...',
      'Running biometric analysis...',
      'Matching against database...',
      'Generating threat assessment...',
      'Compiling identity report...',
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress((i + 1) * (100 / steps.length));
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
      }

      // Generate result
      const result: IdentityResult = {
        ...generateSimulatedResult(),
        imageUrl: imageData,
      };

      setScanResults(prev => [result, ...prev.slice(0, 19)]);
      onIdentityDetected?.(result);

      // Log to security audit
      await supabase.from('security_audit_log').insert({
        event_type: 'facial_recognition_scan',
        event_category: 'identity',
        severity: result.status === 'flagged' ? 'critical' : 'info',
        action_performed: `Facial scan: ${result.status}`,
        metadata: {
          faces_detected: result.facesDetected,
          confidence: result.confidence,
          status: result.status,
          risk_level: result.identityInfo?.riskLevel,
        }
      });

      if (result.status === 'flagged') {
        toast.error('Security Alert', {
          description: 'Flagged individual detected - Review immediately',
        });
      } else if (result.status === 'identified') {
        toast.success('Identity Verified', {
          description: `Identified with ${result.confidence.toFixed(1)}% confidence`,
        });
      } else {
        toast.info('Unknown Individual', {
          description: 'No match found in database',
        });
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error('Analysis Failed', { description: error.message });
    } finally {
      setIsScanning(false);
      setCurrentStep('');
      setProgress(0);
    }
  };

  const getStatusColor = (status: IdentityResult['status']) => {
    const colors = {
      identified: 'bg-success/20 text-success border-success/30',
      unknown: 'bg-warning/20 text-warning border-warning/30',
      flagged: 'bg-destructive/20 text-destructive border-destructive/30',
      processing: 'bg-primary/20 text-primary border-primary/30',
    };
    return colors[status];
  };

  const getRiskColor = (risk?: string) => {
    const colors: Record<string, string> = {
      low: 'bg-success/20 text-success border-success/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return colors[risk || 'low'];
  };

  const getStatusIcon = (status: IdentityResult['status']) => {
    const icons = {
      identified: <UserCheck className="h-4 w-4 text-success" />,
      unknown: <User className="h-4 w-4 text-warning" />,
      flagged: <UserX className="h-4 w-4 text-destructive" />,
      processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    };
    return icons[status];
  };

  const clearResults = () => {
    setScanResults([]);
    setPreviewImage(null);
    toast.success('Results cleared');
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm sm:text-base">Identity Scanner</CardTitle>
              <CardDescription className="text-xs">
                Facial recognition & biometric analysis
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="realtime" className="text-xs">Real-time</Label>
              <Switch
                id="realtime"
                checked={realtimeMonitoring}
                onCheckedChange={setRealtimeMonitoring}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearResults}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanning Progress */}
        {isScanning && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
              <span className="text-sm font-mono">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{currentStep}</p>
          </div>
        )}

        {/* Camera and Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camera Section */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Live Camera
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="auto-scan" className="text-xs">Auto-Scan</Label>
                  <Switch
                    id="auto-scan"
                    checked={autoScan}
                    onCheckedChange={setAutoScan}
                  />
                </div>
              </div>
            </div>

            <div className="relative aspect-video bg-background/50 rounded-lg overflow-hidden mb-3 border border-border">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary/50 rounded-lg"></div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-destructive/80 rounded text-[10px] font-mono flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      LIVE
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Camera className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">Camera inactive</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
              {!cameraActive ? (
                <Button onClick={startCamera} className="flex-1" size="sm">
                  <Camera className="h-3 w-3 mr-1" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={captureFromCamera} className="flex-1" size="sm" disabled={isScanning}>
                    <ScanFace className="h-3 w-3 mr-1" />
                    Scan
                  </Button>
                  <Button onClick={stopCamera} variant="destructive" size="sm">
                    <XCircle className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Image Upload
              </span>
            </div>

            <div
              className={cn(
                "aspect-video bg-background/50 rounded-lg border-2 border-dashed border-border/50 mb-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50",
                previewImage && "border-solid"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Click to upload image</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button 
              onClick={() => previewImage && analyzeImage(previewImage)} 
              className="w-full" 
              size="sm"
              disabled={!previewImage || isScanning}
            >
              <Zap className="h-3 w-3 mr-1" />
              Analyze Image
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Scan Results
            </span>
            <Badge variant="outline" className="text-xs font-mono">
              {scanResults.length} RECORDS
            </Badge>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-2">
              {scanResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanFace className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No scan results yet</p>
                </div>
              ) : (
                scanResults.map((result) => (
                  <div
                    key={result.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      selectedResult?.id === result.id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-background/50 border-border hover:border-primary/20"
                    )}
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="text-sm font-medium capitalize">{result.status}</span>
                        <Badge className={getStatusColor(result.status)}>
                          {result.confidence.toFixed(1)}%
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{result.facesDetected} face(s)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{result.metadata.processingTime}ms</span>
                      </div>
                      {result.identityInfo?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{result.identityInfo.location}</span>
                        </div>
                      )}
                    </div>

                    {result.identityInfo && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {result.identityInfo.name && (
                          <Badge variant="outline" className="text-[10px]">
                            {result.identityInfo.name}
                          </Badge>
                        )}
                        <Badge className={getRiskColor(result.identityInfo.riskLevel)}>
                          {result.identityInfo.riskLevel?.toUpperCase()} RISK
                        </Badge>
                        {result.metadata.facialFeatures?.age && (
                          <Badge variant="outline" className="text-[10px]">
                            Age: {result.metadata.facialFeatures.age}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                Identity Analysis Report
              </DialogTitle>
              <DialogDescription>
                Detailed biometric and identity information
              </DialogDescription>
            </DialogHeader>

            {selectedResult && (
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={cn("p-4 rounded-lg border", getStatusColor(selectedResult.status))}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedResult.status)}
                      <span className="font-medium capitalize">{selectedResult.status}</span>
                    </div>
                    <span className="font-mono text-lg">{selectedResult.confidence.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Image Preview */}
                {selectedResult.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img 
                      src={selectedResult.imageUrl} 
                      alt="Scanned" 
                      className="w-full max-h-48 object-contain bg-background/50"
                    />
                  </div>
                )}

                {/* Identity Info */}
                {selectedResult.identityInfo && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Identity Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedResult.identityInfo.name && (
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-medium">{selectedResult.identityInfo.name}</p>
                        </div>
                      )}
                      {selectedResult.identityInfo.alias && (
                        <div>
                          <span className="text-muted-foreground">Alias:</span>
                          <p className="font-medium text-destructive">{selectedResult.identityInfo.alias}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Risk Level:</span>
                        <Badge className={getRiskColor(selectedResult.identityInfo.riskLevel)}>
                          {selectedResult.identityInfo.riskLevel?.toUpperCase()}
                        </Badge>
                      </div>
                      {selectedResult.identityInfo.biometricMatch && (
                        <div>
                          <span className="text-muted-foreground">Biometric Match:</span>
                          <p className="font-mono">{selectedResult.identityInfo.biometricMatch.toFixed(1)}%</p>
                        </div>
                      )}
                      {selectedResult.identityInfo.lastSeen && (
                        <div>
                          <span className="text-muted-foreground">Last Seen:</span>
                          <p className="font-mono text-xs">
                            {new Date(selectedResult.identityInfo.lastSeen).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedResult.identityInfo.location && (
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <p>{selectedResult.identityInfo.location}</p>
                        </div>
                      )}
                    </div>

                    {selectedResult.identityInfo.threatHistory && selectedResult.identityInfo.threatHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Threat History:</span>
                        <div className="mt-1 space-y-1">
                          {selectedResult.identityInfo.threatHistory.map((threat, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              {threat}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Facial Features */}
                {selectedResult.metadata.facialFeatures && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ScanFace className="h-4 w-4 text-primary" />
                      Facial Analysis
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Est. Age:</span>
                        <p className="font-medium">{selectedResult.metadata.facialFeatures.age}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gender:</span>
                        <p className="font-medium">{selectedResult.metadata.facialFeatures.gender}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expression:</span>
                        <p className="font-medium">{selectedResult.metadata.facialFeatures.emotion}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Scan Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processing Time:</span>
                      <p className="font-mono">{selectedResult.metadata.processingTime}ms</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model Used:</span>
                      <p className="font-mono text-xs">{selectedResult.metadata.modelUsed}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Image Quality:</span>
                      <p className="font-mono">{selectedResult.metadata.imageQuality.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faces Detected:</span>
                      <p className="font-mono">{selectedResult.facesDetected}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
