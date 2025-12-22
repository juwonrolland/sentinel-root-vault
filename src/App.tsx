import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const ThreatDetection = lazy(() => import("./pages/ThreatDetection"));
const AccessControl = lazy(() => import("./pages/AccessControl"));
const SentimentAnalysis = lazy(() => import("./pages/SentimentAnalysis"));
const PiracyDetection = lazy(() => import("./pages/PiracyDetection"));
const IncidentResponse = lazy(() => import("./pages/IncidentResponse"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const ComplianceReports = lazy(() => import("./pages/ComplianceReports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SecurityCompliance = lazy(() => import("./pages/SecurityCompliance"));
const Install = lazy(() => import("./pages/Install"));
const ThreatInvestigation = lazy(() => import("./pages/ThreatInvestigation"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));

// Optimized QueryClient with caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/security-dashboard" element={<SecurityDashboard />} />
            <Route path="/threat-detection" element={<ThreatDetection />} />
            <Route path="/access-control" element={<AccessControl />} />
            <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
            <Route path="/piracy-detection" element={<PiracyDetection />} />
            <Route path="/incident-response" element={<IncidentResponse />} />
            <Route path="/system-health" element={<SystemHealth />} />
            <Route path="/compliance-reports" element={<ComplianceReports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/security-compliance" element={<SecurityCompliance />} />
            <Route path="/install" element={<Install />} />
            <Route path="/threat-investigation" element={<ThreatInvestigation />} />
            <Route path="/security-settings" element={<SecuritySettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
