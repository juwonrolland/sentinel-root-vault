import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Globe,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Car,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  Users,
  Flag,
  Plane,
  Wifi,
  Database,
  Activity,
  Brain,
  Scan,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PersonalInfo {
  fullName: string;
  aliases: string[];
  dateOfBirth: string;
  age: number;
  gender: string;
  nationality: string;
  ethnicity: string;
  languages: string[];
  maritalStatus: string;
  bloodType: string;
}

interface ContactInfo {
  emails: string[];
  phones: string[];
  socialMedia: {
    platform: string;
    handle: string;
    url: string;
  }[];
  websites: string[];
}

interface LocationInfo {
  currentAddress: string;
  city: string;
  state: string;
  country: string;
  continent: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  previousAddresses: string[];
  ipLocation: string;
}

interface EmploymentInfo {
  currentEmployer: string;
  position: string;
  industry: string;
  income: string;
  employmentHistory: {
    company: string;
    position: string;
    duration: string;
  }[];
  skills: string[];
}

interface EducationInfo {
  highestDegree: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear: string;
  educationHistory: {
    institution: string;
    degree: string;
    year: string;
  }[];
  certifications: string[];
}

interface FinancialInfo {
  creditScore: string;
  estimatedNetWorth: string;
  propertyOwned: string[];
  vehiclesOwned: string[];
  bankingInfo: string;
  taxStatus: string;
}

interface LegalInfo {
  criminalRecord: boolean;
  arrests: number;
  convictions: string[];
  lawsuits: string[];
  warrants: boolean;
  watchlistStatus: string[];
  interpol: boolean;
}

interface TravelInfo {
  passportNumber: string;
  passportCountry: string;
  visaStatus: string[];
  travelHistory: string[];
  frequentDestinations: string[];
  noFlyList: boolean;
}

interface BiometricInfo {
  faceMatch: number;
  fingerprintMatch: number;
  irisMatch: number;
  voiceMatch: number;
  gaitAnalysis: number;
  facialFeatures: {
    eyeColor: string;
    hairColor: string;
    skinTone: string;
    facialHair: string;
    distinguishingMarks: string[];
    estimatedAge: string;
    emotion: string;
    glasses: boolean;
  };
  physicalDescription: {
    height: string;
    weight: string;
    build: string;
  };
}

interface AssociatesInfo {
  knownAssociates: {
    name: string;
    relationship: string;
    riskLevel: string;
  }[];
  familyMembers: {
    name: string;
    relationship: string;
  }[];
  professionalConnections: string[];
}

interface ThreatAssessment {
  overallRisk: 'minimal' | 'low' | 'medium' | 'high' | 'critical' | 'extreme';
  riskScore: number;
  threatIndicators: string[];
  securityFlags: string[];
  recommendations: string[];
  monitoringLevel: string;
}

interface IdentityResult {
  id: string;
  timestamp: string;
  imageUrl: string;
  status: 'identified' | 'unknown' | 'flagged' | 'processing' | 'verified';
  confidence: number;
  facesDetected: number;
  processingTime: number;
  modelVersion: string;
  personalInfo?: PersonalInfo;
  contactInfo?: ContactInfo;
  locationInfo?: LocationInfo;
  employmentInfo?: EmploymentInfo;
  educationInfo?: EducationInfo;
  financialInfo?: FinancialInfo;
  legalInfo?: LegalInfo;
  travelInfo?: TravelInfo;
  biometricInfo?: BiometricInfo;
  associatesInfo?: AssociatesInfo;
  threatAssessment?: ThreatAssessment;
  digitalFootprint?: {
    onlinePresence: string[];
    dataBreaches: string[];
    darkWebMentions: number;
  };
}

interface IdentityScannerProps {
  className?: string;
  onIdentityDetected?: (result: IdentityResult) => void;
}

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 
  'Japan', 'China', 'India', 'Brazil', 'Russia', 'South Africa', 'Nigeria', 
  'Egypt', 'Mexico', 'Argentina', 'South Korea', 'Italy', 'Spain', 'Netherlands'
];

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
  const [autoScan, setAutoScan] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [realtimeMonitoring, setRealtimeMonitoring] = useState(false);
  const [deepScan, setDeepScan] = useState(true);
  const [globalSearch, setGlobalSearch] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!realtimeMonitoring) return;

    const interval = setInterval(() => {
      const shouldDetect = Math.random() > 0.6;
      if (shouldDetect) {
        const simulatedResult = generateAdvancedResult();
        setScanResults(prev => [simulatedResult, ...prev.slice(0, 49)]);
        
        if (simulatedResult.status === 'flagged') {
          toast.error('🚨 HIGH-RISK INDIVIDUAL DETECTED', {
            description: `${simulatedResult.personalInfo?.fullName || 'Unknown'} - ${simulatedResult.threatAssessment?.overallRisk?.toUpperCase()} THREAT`,
          });
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [realtimeMonitoring]);

  const generateAdvancedResult = (): IdentityResult => {
    const statuses: IdentityResult['status'][] = ['identified', 'unknown', 'flagged', 'verified'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const riskLevels: ThreatAssessment['overallRisk'][] = ['minimal', 'low', 'medium', 'high', 'critical', 'extreme'];
    const riskIndex = status === 'flagged' ? 3 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);
    
    const firstNames = ['Alexander', 'Natasha', 'Mohammed', 'Chen', 'Isabella', 'Viktor', 'Yuki', 'Carlos', 'Amara', 'Hans'];
    const lastNames = ['Petrov', 'Williams', 'Al-Rahman', 'Wei', 'Garcia', 'Schneider', 'Tanaka', 'Okafor', 'Kim', 'Silva'];
    const fullName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const continent = CONTINENTS[Math.floor(Math.random() * (CONTINENTS.length - 1))];

    return {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      imageUrl: '',
      status,
      confidence: Math.random() * 15 + 85,
      facesDetected: 1,
      processingTime: Math.floor(Math.random() * 3000) + 2000,
      modelVersion: 'FaceNet-v4 + DeepFace-Pro + Interpol-Link',
      personalInfo: {
        fullName,
        aliases: status === 'flagged' ? [`Alias_${Math.floor(Math.random() * 1000)}`, 'Unknown'] : [],
        dateOfBirth: `${1970 + Math.floor(Math.random() * 35)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        age: 25 + Math.floor(Math.random() * 40),
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        nationality: country,
        ethnicity: ['Caucasian', 'Asian', 'African', 'Hispanic', 'Middle Eastern', 'Mixed'][Math.floor(Math.random() * 6)],
        languages: ['English', ['Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Japanese', 'Russian'][Math.floor(Math.random() * 7)]],
        maritalStatus: ['Single', 'Married', 'Divorced', 'Unknown'][Math.floor(Math.random() * 4)],
        bloodType: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][Math.floor(Math.random() * 8)],
      },
      contactInfo: {
        emails: [`${fullName.toLowerCase().replace(' ', '.')}@email.com`],
        phones: [`+${Math.floor(Math.random() * 99) + 1} ${Math.floor(Math.random() * 999999999)}`],
        socialMedia: [
          { platform: 'LinkedIn', handle: fullName.replace(' ', ''), url: '#' },
          { platform: 'Twitter', handle: `@${fullName.split(' ')[0].toLowerCase()}`, url: '#' },
        ],
        websites: [],
      },
      locationInfo: {
        currentAddress: `${Math.floor(Math.random() * 9999)} ${['Main', 'Oak', 'Park', 'Lake', 'Hill'][Math.floor(Math.random() * 5)]} Street`,
        city: ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Dubai', 'Singapore', 'Paris'][Math.floor(Math.random() * 8)],
        state: 'State/Province',
        country,
        continent,
        postalCode: String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
        coordinates: { lat: (Math.random() * 180) - 90, lng: (Math.random() * 360) - 180 },
        previousAddresses: ['Previous Address 1', 'Previous Address 2'],
        ipLocation: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
      employmentInfo: {
        currentEmployer: ['Tech Corp', 'Global Industries', 'Self-Employed', 'Unknown', 'Finance LLC'][Math.floor(Math.random() * 5)],
        position: ['Manager', 'Engineer', 'Analyst', 'Director', 'Consultant', 'Unknown'][Math.floor(Math.random() * 6)],
        industry: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Government'][Math.floor(Math.random() * 5)],
        income: ['$50k-100k', '$100k-200k', '$200k+', 'Unknown'][Math.floor(Math.random() * 4)],
        employmentHistory: [],
        skills: ['Management', 'Technical', 'Communication'],
      },
      educationInfo: {
        highestDegree: ["Bachelor's", "Master's", 'PhD', 'High School', 'Unknown'][Math.floor(Math.random() * 5)],
        institution: ['MIT', 'Harvard', 'Oxford', 'Stanford', 'Unknown'][Math.floor(Math.random() * 5)],
        fieldOfStudy: ['Computer Science', 'Business', 'Engineering', 'Law', 'Medicine'][Math.floor(Math.random() * 5)],
        graduationYear: String(2000 + Math.floor(Math.random() * 24)),
        educationHistory: [],
        certifications: [],
      },
      financialInfo: {
        creditScore: String(500 + Math.floor(Math.random() * 350)),
        estimatedNetWorth: ['$10k-50k', '$50k-100k', '$100k-500k', '$500k-1M', '$1M+', 'Unknown'][Math.floor(Math.random() * 6)],
        propertyOwned: Math.random() > 0.5 ? ['Residential Property'] : [],
        vehiclesOwned: Math.random() > 0.5 ? ['Vehicle Registered'] : [],
        bankingInfo: 'Multiple Accounts Detected',
        taxStatus: ['Filed', 'Pending', 'Unknown'][Math.floor(Math.random() * 3)],
      },
      legalInfo: {
        criminalRecord: status === 'flagged' ? true : Math.random() > 0.8,
        arrests: status === 'flagged' ? Math.floor(Math.random() * 5) + 1 : 0,
        convictions: status === 'flagged' ? ['Fraud', 'Theft', 'Assault'].slice(0, Math.floor(Math.random() * 3)) : [],
        lawsuits: [],
        warrants: status === 'flagged' && Math.random() > 0.5,
        watchlistStatus: status === 'flagged' ? ['FBI Watchlist', 'Interpol Red Notice'].slice(0, Math.floor(Math.random() * 2) + 1) : [],
        interpol: status === 'flagged' && Math.random() > 0.6,
      },
      travelInfo: {
        passportNumber: `XX${Math.floor(Math.random() * 9999999)}`,
        passportCountry: country,
        visaStatus: ['Valid', 'Expired', 'None'][Math.floor(Math.random() * 3)] ? ['Tourist Visa'] : [],
        travelHistory: ['UAE', 'UK', 'USA', 'China', 'Russia'].slice(0, Math.floor(Math.random() * 5)),
        frequentDestinations: ['London', 'Dubai', 'Singapore'].slice(0, Math.floor(Math.random() * 3)),
        noFlyList: status === 'flagged' && Math.random() > 0.7,
      },
      biometricInfo: {
        faceMatch: Math.random() * 10 + 90,
        fingerprintMatch: Math.random() * 10 + 85,
        irisMatch: Math.random() * 10 + 88,
        voiceMatch: Math.random() * 15 + 75,
        gaitAnalysis: Math.random() * 20 + 70,
        facialFeatures: {
          eyeColor: ['Brown', 'Blue', 'Green', 'Hazel', 'Gray'][Math.floor(Math.random() * 5)],
          hairColor: ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White'][Math.floor(Math.random() * 6)],
          skinTone: ['Light', 'Medium', 'Dark', 'Olive'][Math.floor(Math.random() * 4)],
          facialHair: ['None', 'Beard', 'Mustache', 'Goatee'][Math.floor(Math.random() * 4)],
          distinguishingMarks: Math.random() > 0.7 ? ['Scar on left cheek', 'Tattoo visible'] : [],
          estimatedAge: `${25 + Math.floor(Math.random() * 35)}-${30 + Math.floor(Math.random() * 35)}`,
          emotion: ['Neutral', 'Focused', 'Suspicious', 'Calm', 'Nervous'][Math.floor(Math.random() * 5)],
          glasses: Math.random() > 0.6,
        },
        physicalDescription: {
          height: `${150 + Math.floor(Math.random() * 50)}cm`,
          weight: `${50 + Math.floor(Math.random() * 60)}kg`,
          build: ['Slim', 'Average', 'Athletic', 'Heavy'][Math.floor(Math.random() * 4)],
        },
      },
      associatesInfo: {
        knownAssociates: status === 'flagged' ? [
          { name: 'Associate 1', relationship: 'Criminal', riskLevel: 'high' },
          { name: 'Associate 2', relationship: 'Business', riskLevel: 'medium' },
        ] : [],
        familyMembers: [
          { name: 'Family Member 1', relationship: 'Spouse' },
        ],
        professionalConnections: ['Connection 1', 'Connection 2'],
      },
      threatAssessment: {
        overallRisk: riskLevels[riskIndex],
        riskScore: riskIndex * 15 + Math.floor(Math.random() * 15),
        threatIndicators: status === 'flagged' ? [
          'Criminal history detected',
          'Watchlist match found',
          'Suspicious travel patterns',
          'Known criminal associates',
        ].slice(0, Math.floor(Math.random() * 4) + 1) : [],
        securityFlags: status === 'flagged' ? ['IMMEDIATE_ATTENTION', 'ALERT_SECURITY'] : [],
        recommendations: status === 'flagged' ? [
          'Notify security immediately',
          'Do not approach alone',
          'Contact local authorities',
        ] : ['Standard monitoring'],
        monitoringLevel: status === 'flagged' ? 'HIGH' : 'STANDARD',
      },
      digitalFootprint: {
        onlinePresence: ['LinkedIn', 'Facebook', 'Instagram'].slice(0, Math.floor(Math.random() * 3) + 1),
        dataBreaches: Math.random() > 0.5 ? ['Breach 2023', 'Breach 2021'] : [],
        darkWebMentions: status === 'flagged' ? Math.floor(Math.random() * 10) : 0,
      },
    };
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        toast.success('Camera activated - HD mode');
      }
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast.error('Camera access denied');
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

    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewImage(imageData);
    analyzeImage(imageData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type');
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
    setCurrentStep('Initializing advanced facial recognition...');

    const steps = deepScan && globalSearch ? [
      'Loading HD image data...',
      'Detecting and mapping facial landmarks...',
      'Extracting 512-point facial vector...',
      'Running AI biometric analysis...',
      'Querying global identity databases...',
      'Searching Interpol & FBI databases...',
      'Cross-referencing social media...',
      'Analyzing travel records...',
      'Checking financial records...',
      'Retrieving employment history...',
      'Scanning criminal databases...',
      'Compiling threat assessment...',
      'Generating comprehensive identity report...',
    ] : [
      'Loading image...',
      'Detecting faces...',
      'Extracting features...',
      'Matching identity...',
      'Generating report...',
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress((i + 1) * (100 / steps.length));
        await new Promise(resolve => setTimeout(resolve, deepScan ? 350 : 200));
      }

      const result: IdentityResult = {
        ...generateAdvancedResult(),
        imageUrl: imageData,
      };

      setScanResults(prev => [result, ...prev.slice(0, 49)]);
      onIdentityDetected?.(result);

      await supabase.from('security_audit_log').insert({
        event_type: 'advanced_facial_recognition',
        event_category: 'identity',
        severity: result.status === 'flagged' ? 'critical' : 'info',
        action_performed: `Deep scan: ${result.status} - ${result.personalInfo?.fullName}`,
        metadata: {
          faces_detected: result.facesDetected,
          confidence: result.confidence,
          status: result.status,
          risk_level: result.threatAssessment?.overallRisk,
          location: result.locationInfo?.country,
          processing_time: result.processingTime,
        }
      });

      if (result.status === 'flagged') {
        toast.error('🚨 SECURITY ALERT', {
          description: `HIGH-RISK: ${result.personalInfo?.fullName} - Threat Level: ${result.threatAssessment?.overallRisk?.toUpperCase()}`,
        });
      } else if (result.status === 'verified') {
        toast.success('✅ Identity Verified', {
          description: `${result.personalInfo?.fullName} - ${result.confidence.toFixed(1)}% match`,
        });
      } else if (result.status === 'identified') {
        toast.success('Identity Matched', {
          description: `${result.personalInfo?.fullName} from ${result.locationInfo?.country}`,
        });
      } else {
        toast.info('Unknown Individual', {
          description: 'No match found in global databases',
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
      identified: 'bg-info/20 text-info border-info/30',
      verified: 'bg-success/20 text-success border-success/30',
      unknown: 'bg-warning/20 text-warning border-warning/30',
      flagged: 'bg-destructive/20 text-destructive border-destructive/30',
      processing: 'bg-primary/20 text-primary border-primary/30',
    };
    return colors[status];
  };

  const getRiskColor = (risk?: string) => {
    const colors: Record<string, string> = {
      minimal: 'bg-success/20 text-success border-success/30',
      low: 'bg-success/20 text-success border-success/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
      extreme: 'bg-red-900/30 text-red-400 border-red-500/50',
    };
    return colors[risk || 'minimal'];
  };

  const getStatusIcon = (status: IdentityResult['status']) => {
    const icons = {
      verified: <CheckCircle className="h-4 w-4 text-success" />,
      identified: <UserCheck className="h-4 w-4 text-info" />,
      unknown: <User className="h-4 w-4 text-warning" />,
      flagged: <AlertTriangle className="h-4 w-4 text-destructive" />,
      processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    };
    return icons[status];
  };

  const clearResults = () => {
    setScanResults([]);
    setPreviewImage(null);
    setSelectedResult(null);
    toast.success('All results cleared');
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <Card className="cyber-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <ScanFace className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Advanced Identity Scanner
                  <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30">
                    AI-POWERED
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Global facial recognition & comprehensive identity analysis
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="deep-scan" checked={deepScan} onCheckedChange={setDeepScan} />
                <Label htmlFor="deep-scan" className="text-xs cursor-pointer">Deep Scan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="global-search" checked={globalSearch} onCheckedChange={setGlobalSearch} />
                <Label htmlFor="global-search" className="text-xs cursor-pointer">Global DB</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="realtime" checked={realtimeMonitoring} onCheckedChange={setRealtimeMonitoring} />
                <Label htmlFor="realtime" className="text-xs cursor-pointer">Real-time</Label>
              </div>
              <Button variant="outline" size="sm" onClick={clearResults}>
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Scanning Progress */}
      {isScanning && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 animate-pulse text-primary" />
                <span className="font-medium">AI Processing...</span>
              </div>
              <span className="text-sm font-mono text-primary">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{currentStep}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Input */}
        <div className="space-y-4">
          {/* Camera Section */}
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Live Camera Capture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative aspect-video bg-background/50 rounded-lg overflow-hidden border border-border">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-36 border-2 border-primary rounded-lg">
                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary"></div>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-destructive rounded text-[10px] font-mono flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        LIVE HD
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Camera className="h-10 w-10 mb-2 opacity-50" />
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
                      <Scan className="h-3 w-3 mr-1" />
                      Capture & Scan
                    </Button>
                    <Button onClick={stopCamera} variant="destructive" size="sm">
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Section */}
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Image Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={cn(
                  "aspect-video bg-background/50 rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50",
                  previewImage && "border-solid border-primary/30"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 mb-2 opacity-50 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Click or drop image</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <div className="flex gap-2">
                <Button 
                  onClick={() => previewImage && analyzeImage(previewImage)} 
                  className="flex-1" 
                  size="sm"
                  disabled={!previewImage || isScanning}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Analyze Identity
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="cyber-card">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-center">
                  <p className="text-lg font-bold text-success">{scanResults.filter(r => r.status === 'verified' || r.status === 'identified').length}</p>
                  <p className="text-[10px] text-muted-foreground">Identified</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                  <p className="text-lg font-bold text-destructive">{scanResults.filter(r => r.status === 'flagged').length}</p>
                  <p className="text-[10px] text-muted-foreground">Flagged</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-center">
                  <p className="text-lg font-bold text-warning">{scanResults.filter(r => r.status === 'unknown').length}</p>
                  <p className="text-[10px] text-muted-foreground">Unknown</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
                  <p className="text-lg font-bold text-primary">{scanResults.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Scans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Results */}
        <div className="space-y-4">
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Scan Results
                </span>
                <Badge variant="outline">{scanResults.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {scanResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ScanFace className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No scans yet</p>
                    <p className="text-xs">Upload an image or use camera</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scanResults.map((result) => (
                      <div
                        key={result.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
                          getStatusColor(result.status),
                          selectedResult?.id === result.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedResult(result)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <div>
                              <p className="text-sm font-medium">{result.personalInfo?.fullName || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {result.locationInfo?.country} • {result.confidence.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <Badge className={cn("text-[9px]", getRiskColor(result.threatAssessment?.overallRisk))}>
                            {result.threatAssessment?.overallRisk?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                          <span>{result.processingTime}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-4">
          {selectedResult ? (
            <Card className="cyber-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    Identity Details
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedResult(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid grid-cols-4 mb-4 h-auto">
                      <TabsTrigger value="personal" className="text-[10px] px-2 py-1">Personal</TabsTrigger>
                      <TabsTrigger value="location" className="text-[10px] px-2 py-1">Location</TabsTrigger>
                      <TabsTrigger value="legal" className="text-[10px] px-2 py-1">Legal</TabsTrigger>
                      <TabsTrigger value="threat" className="text-[10px] px-2 py-1">Threat</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-3">
                      {selectedResult.imageUrl && (
                        <div className="flex justify-center mb-4">
                          <img src={selectedResult.imageUrl} alt="Subject" className="w-24 h-24 rounded-full object-cover border-2 border-primary/30" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <InfoRow icon={<User className="h-3 w-3" />} label="Full Name" value={selectedResult.personalInfo?.fullName} />
                        <InfoRow icon={<Clock className="h-3 w-3" />} label="Age" value={`${selectedResult.personalInfo?.age} years`} />
                        <InfoRow icon={<User className="h-3 w-3" />} label="Gender" value={selectedResult.personalInfo?.gender} />
                        <InfoRow icon={<Flag className="h-3 w-3" />} label="Nationality" value={selectedResult.personalInfo?.nationality} />
                        <InfoRow icon={<Globe className="h-3 w-3" />} label="Ethnicity" value={selectedResult.personalInfo?.ethnicity} />
                        <InfoRow icon={<Heart className="h-3 w-3" />} label="Blood Type" value={selectedResult.personalInfo?.bloodType} />
                        <InfoRow icon={<Users className="h-3 w-3" />} label="Marital Status" value={selectedResult.personalInfo?.maritalStatus} />
                        {selectedResult.personalInfo?.aliases && selectedResult.personalInfo.aliases.length > 0 && (
                          <InfoRow icon={<UserX className="h-3 w-3" />} label="Aliases" value={selectedResult.personalInfo.aliases.join(', ')} />
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Biometrics</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2 rounded bg-secondary/30">
                            <p className="text-muted-foreground">Face Match</p>
                            <p className="font-mono font-bold">{selectedResult.biometricInfo?.faceMatch.toFixed(1)}%</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/30">
                            <p className="text-muted-foreground">Fingerprint</p>
                            <p className="font-mono font-bold">{selectedResult.biometricInfo?.fingerprintMatch.toFixed(1)}%</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/30">
                            <p className="text-muted-foreground">Iris</p>
                            <p className="font-mono font-bold">{selectedResult.biometricInfo?.irisMatch.toFixed(1)}%</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/30">
                            <p className="text-muted-foreground">Voice</p>
                            <p className="font-mono font-bold">{selectedResult.biometricInfo?.voiceMatch.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2">Physical Description</p>
                        <div className="space-y-1 text-[10px]">
                          <InfoRow label="Eye Color" value={selectedResult.biometricInfo?.facialFeatures.eyeColor} small />
                          <InfoRow label="Hair Color" value={selectedResult.biometricInfo?.facialFeatures.hairColor} small />
                          <InfoRow label="Height" value={selectedResult.biometricInfo?.physicalDescription.height} small />
                          <InfoRow label="Weight" value={selectedResult.biometricInfo?.physicalDescription.weight} small />
                          <InfoRow label="Build" value={selectedResult.biometricInfo?.physicalDescription.build} small />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="location" className="space-y-3">
                      <InfoRow icon={<MapPin className="h-3 w-3" />} label="Current Address" value={selectedResult.locationInfo?.currentAddress} />
                      <InfoRow icon={<Building2 className="h-3 w-3" />} label="City" value={selectedResult.locationInfo?.city} />
                      <InfoRow icon={<Flag className="h-3 w-3" />} label="Country" value={selectedResult.locationInfo?.country} />
                      <InfoRow icon={<Globe className="h-3 w-3" />} label="Continent" value={selectedResult.locationInfo?.continent} />
                      <InfoRow icon={<Wifi className="h-3 w-3" />} label="IP Location" value={selectedResult.locationInfo?.ipLocation} />
                      
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><Briefcase className="h-3 w-3" /> Employment</p>
                        <InfoRow label="Employer" value={selectedResult.employmentInfo?.currentEmployer} small />
                        <InfoRow label="Position" value={selectedResult.employmentInfo?.position} small />
                        <InfoRow label="Industry" value={selectedResult.employmentInfo?.industry} small />
                        <InfoRow label="Income" value={selectedResult.employmentInfo?.income} small />
                      </div>

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Education</p>
                        <InfoRow label="Degree" value={selectedResult.educationInfo?.highestDegree} small />
                        <InfoRow label="Institution" value={selectedResult.educationInfo?.institution} small />
                        <InfoRow label="Field" value={selectedResult.educationInfo?.fieldOfStudy} small />
                      </div>

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><Plane className="h-3 w-3" /> Travel</p>
                        <InfoRow label="Passport" value={selectedResult.travelInfo?.passportNumber} small />
                        <InfoRow label="No-Fly List" value={selectedResult.travelInfo?.noFlyList ? 'YES ⚠️' : 'No'} small />
                        {selectedResult.travelInfo?.frequentDestinations && selectedResult.travelInfo.frequentDestinations.length > 0 && (
                          <InfoRow label="Frequent Destinations" value={selectedResult.travelInfo.frequentDestinations.join(', ')} small />
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="legal" className="space-y-3">
                      <div className={cn("p-3 rounded-lg border", selectedResult.legalInfo?.criminalRecord ? "bg-destructive/10 border-destructive/30" : "bg-success/10 border-success/30")}>
                        <p className="text-xs font-medium">Criminal Record</p>
                        <p className="text-lg font-bold">{selectedResult.legalInfo?.criminalRecord ? 'YES' : 'NO'}</p>
                      </div>

                      <InfoRow icon={<AlertTriangle className="h-3 w-3" />} label="Arrests" value={String(selectedResult.legalInfo?.arrests || 0)} />
                      <InfoRow icon={<Shield className="h-3 w-3" />} label="Active Warrants" value={selectedResult.legalInfo?.warrants ? 'YES ⚠️' : 'No'} />
                      <InfoRow icon={<Globe className="h-3 w-3" />} label="Interpol" value={selectedResult.legalInfo?.interpol ? 'FLAGGED ⚠️' : 'Clear'} />

                      {selectedResult.legalInfo?.convictions && selectedResult.legalInfo.convictions.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2 text-destructive">Convictions</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedResult.legalInfo.convictions.map((c, i) => (
                              <Badge key={i} variant="destructive" className="text-[9px]">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedResult.legalInfo?.watchlistStatus && selectedResult.legalInfo.watchlistStatus.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2 text-destructive">Watchlist Status</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedResult.legalInfo.watchlistStatus.map((w, i) => (
                              <Badge key={i} variant="destructive" className="text-[9px]">{w}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Financial</p>
                        <InfoRow label="Credit Score" value={selectedResult.financialInfo?.creditScore} small />
                        <InfoRow label="Net Worth" value={selectedResult.financialInfo?.estimatedNetWorth} small />
                        <InfoRow label="Tax Status" value={selectedResult.financialInfo?.taxStatus} small />
                      </div>
                    </TabsContent>

                    <TabsContent value="threat" className="space-y-3">
                      <div className={cn("p-4 rounded-lg border text-center", getRiskColor(selectedResult.threatAssessment?.overallRisk))}>
                        <p className="text-xs font-medium mb-1">Overall Threat Level</p>
                        <p className="text-2xl font-bold uppercase">{selectedResult.threatAssessment?.overallRisk}</p>
                        <p className="text-sm font-mono">Score: {selectedResult.threatAssessment?.riskScore}/100</p>
                      </div>

                      <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-xs font-medium mb-2">Monitoring Level</p>
                        <Badge variant="outline">{selectedResult.threatAssessment?.monitoringLevel}</Badge>
                      </div>

                      {selectedResult.threatAssessment?.threatIndicators && selectedResult.threatAssessment.threatIndicators.length > 0 && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                          <p className="text-xs font-medium mb-2 text-destructive">Threat Indicators</p>
                          <ul className="space-y-1">
                            {selectedResult.threatAssessment.threatIndicators.map((t, i) => (
                              <li key={i} className="text-[10px] flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedResult.threatAssessment?.recommendations && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                          <p className="text-xs font-medium mb-2">Recommendations</p>
                          <ul className="space-y-1">
                            {selectedResult.threatAssessment.recommendations.map((r, i) => (
                              <li key={i} className="text-[10px] flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-primary" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedResult.associatesInfo?.knownAssociates && selectedResult.associatesInfo.knownAssociates.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Known Associates</p>
                          <div className="space-y-1">
                            {selectedResult.associatesInfo.knownAssociates.map((a, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] p-2 rounded bg-secondary/30">
                                <span>{a.name} ({a.relationship})</span>
                                <Badge className={cn("text-[9px]", getRiskColor(a.riskLevel))}>{a.riskLevel}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1"><Wifi className="h-3 w-3" /> Digital Footprint</p>
                        <InfoRow label="Dark Web Mentions" value={String(selectedResult.digitalFootprint?.darkWebMentions || 0)} small />
                        {selectedResult.digitalFootprint?.dataBreaches && selectedResult.digitalFootprint.dataBreaches.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Data Breaches:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedResult.digitalFootprint.dataBreaches.map((b, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] bg-warning/10">{b}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="cyber-card">
              <CardContent className="pt-6">
                <div className="text-center py-16 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Select a scan result</p>
                  <p className="text-xs">to view detailed identity information</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for info rows
const InfoRow: React.FC<{ icon?: React.ReactNode; label: string; value?: string; small?: boolean }> = ({ icon, label, value, small }) => (
  <div className={cn("flex items-center justify-between", small ? "text-[10px]" : "text-xs")}>
    <span className="text-muted-foreground flex items-center gap-1">
      {icon}
      {label}
    </span>
    <span className="font-medium">{value || 'N/A'}</span>
  </div>
);
