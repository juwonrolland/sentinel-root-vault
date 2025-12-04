import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Shield,
  AlertTriangle,
  Fingerprint,
  MessageSquare,
  FileText,
  Activity,
  Bell,
  Globe,
  Scan,
  Home,
  Info,
  Phone,
  Lock,
  ScrollText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  color: string;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", path: "/dashboard", icon: Home, color: "text-primary" },
  { title: "Security Command", path: "/security-dashboard", icon: Shield, color: "text-primary" },
  { title: "Threat Intelligence", path: "/threat-detection", icon: AlertTriangle, color: "text-destructive" },
  { title: "Access Control", path: "/access-control", icon: Fingerprint, color: "text-success" },
  { title: "Forensic NLP", path: "/sentiment-analysis", icon: MessageSquare, color: "text-accent" },
  { title: "Incident Response", path: "/incident-response", icon: FileText, color: "text-warning" },
  { title: "System Health", path: "/system-health", icon: Activity, color: "text-info" },
  { title: "Compliance", path: "/compliance-reports", icon: FileText, color: "text-primary" },
  { title: "Notifications", path: "/notifications", icon: Bell, color: "text-warning" },
  { title: "Security Standards", path: "/security-compliance", icon: Globe, color: "text-success" },
  { title: "Piracy Detection", path: "/piracy-detection", icon: Scan, color: "text-accent" },
];

const footerNavItems: NavItem[] = [
  { title: "About", path: "/about", icon: Info, color: "text-muted-foreground" },
  { title: "Contact", path: "/contact", icon: Phone, color: "text-muted-foreground" },
  { title: "Privacy Policy", path: "/privacy-policy", icon: Lock, color: "text-muted-foreground" },
  { title: "Terms of Service", path: "/terms-of-service", icon: ScrollText, color: "text-muted-foreground" },
];

export const MobileNavDrawer = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border-border/50 hover:bg-primary/10 hover:border-primary/50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[85vw] max-w-[320px] bg-card/95 backdrop-blur-xl border-border/50 p-0"
      >
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-sm font-bold text-gradient">GLORIOUS GLOBAL</h2>
              <p className="text-[10px] text-muted-foreground font-mono">SECURITY PLATFORM</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-3">
            {/* Main Navigation */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono px-3 mb-2">
                Security Modules
              </p>
              <nav className="space-y-1">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive(item.path)
                        ? "bg-primary/10 border border-primary/30 text-primary"
                        : "hover:bg-secondary/50 text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive(item.path) ? "text-primary" : item.color)} />
                    <span className="text-sm font-medium truncate">{item.title}</span>
                    {isActive(item.path) && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 mx-3 my-4" />

            {/* Footer Navigation */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono px-3 mb-2">
                Information
              </p>
              <nav className="space-y-1">
                {footerNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      isActive(item.path)
                        ? "bg-primary/10 border border-primary/30 text-primary"
                        : "hover:bg-secondary/50 text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{item.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </ScrollArea>

        {/* Bottom Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-card/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-mono">SYSTEMS ONLINE</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">v2.0</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
