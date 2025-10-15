import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import ThreatDetection from "./pages/ThreatDetection";
import AccessControl from "./pages/AccessControl";
import SentimentAnalysis from "./pages/SentimentAnalysis";
import IncidentResponse from "./pages/IncidentResponse";
import SystemHealth from "./pages/SystemHealth";
import ComplianceReports from "./pages/ComplianceReports";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/security-dashboard" element={<SecurityDashboard />} />
          <Route path="/threat-detection" element={<ThreatDetection />} />
          <Route path="/access-control" element={<AccessControl />} />
          <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
          <Route path="/incident-response" element={<IncidentResponse />} />
          <Route path="/system-health" element={<SystemHealth />} />
          <Route path="/compliance-reports" element={<ComplianceReports />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
