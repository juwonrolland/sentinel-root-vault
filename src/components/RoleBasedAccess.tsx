import { ReactNode } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";

type AppRole = 'admin' | 'analyst' | 'viewer';

interface RoleBasedAccessProps {
  children: ReactNode;
  requiredRole?: AppRole;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

interface RoleGuardProps {
  children: ReactNode;
  roles: AppRole[];
  fallback?: ReactNode;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AnalystOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Access Denied Component
const AccessDenied = ({ requiredRole }: { requiredRole?: AppRole }) => (
  <Card className="cyber-card border-destructive/30">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <div className="p-4 rounded-full bg-destructive/10 mb-4">
        <Lock className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-destructive mb-2">Access Denied</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        You do not have permission to access this feature.
        {requiredRole && (
          <span className="block mt-1">
            Required role: <span className="font-semibold capitalize">{requiredRole}</span>
          </span>
        )}
      </p>
    </CardContent>
  </Card>
);

// Loading State
const LoadingAccess = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
      <Shield className="h-5 w-5 animate-spin" />
      <span className="text-sm">Verifying access...</span>
    </div>
  </div>
);

// Main Role-Based Access Component
export const RoleBasedAccess = ({
  children,
  requiredRole,
  fallback,
  showAccessDenied = true,
}: RoleBasedAccessProps) => {
  const { hasRole, loading } = useRoleAccess();

  if (loading) {
    return <LoadingAccess />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    if (fallback) return <>{fallback}</>;
    if (showAccessDenied) return <AccessDenied requiredRole={requiredRole} />;
    return null;
  }

  return <>{children}</>;
};

// Role Guard - requires one of multiple roles
export const RoleGuard = ({ children, roles, fallback }: RoleGuardProps) => {
  const { hasRole, loading } = useRoleAccess();

  if (loading) {
    return <LoadingAccess />;
  }

  const hasAccess = roles.some(role => hasRole(role));

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied />;
  }

  return <>{children}</>;
};

// Admin Only Component
export const AdminOnly = ({ children, fallback }: AdminOnlyProps) => {
  const { isAdmin, loading } = useRoleAccess();

  if (loading) return <LoadingAccess />;
  if (!isAdmin) return fallback ? <>{fallback}</> : null;

  return <>{children}</>;
};

// Analyst Only Component (includes admin)
export const AnalystOnly = ({ children, fallback }: AnalystOnlyProps) => {
  const { isAnalyst, loading } = useRoleAccess();

  if (loading) return <LoadingAccess />;
  if (!isAnalyst) return fallback ? <>{fallback}</> : null;

  return <>{children}</>;
};

// Role Badge Display
export const RoleBadge = () => {
  const { role, loading } = useRoleAccess();

  if (loading) return null;

  const roleStyles = {
    admin: 'bg-destructive/10 text-destructive border-destructive/30',
    analyst: 'bg-warning/10 text-warning border-warning/30',
    viewer: 'bg-primary/10 text-primary border-primary/30',
  };

  const roleIcons = {
    admin: <Shield className="h-3 w-3" />,
    analyst: <AlertTriangle className="h-3 w-3" />,
    viewer: <Lock className="h-3 w-3" />,
  };

  if (!role) return null;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium ${roleStyles[role]}`}>
      {roleIcons[role]}
      <span className="uppercase">{role}</span>
    </div>
  );
};

// Permission Check Hook Result Display
export const PermissionIndicator = ({ 
  permission,
  label 
}: { 
  permission: boolean;
  label: string;
}) => (
  <div className="flex items-center gap-2 text-xs">
    {permission ? (
      <div className="w-2 h-2 rounded-full bg-success" />
    ) : (
      <div className="w-2 h-2 rounded-full bg-destructive" />
    )}
    <span className={permission ? 'text-success' : 'text-destructive'}>{label}</span>
  </div>
);
