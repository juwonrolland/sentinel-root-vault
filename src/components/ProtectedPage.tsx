import { ReactNode } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { RoleBasedAccess, RoleBadge } from "@/components/RoleBasedAccess";

type AppRole = 'admin' | 'analyst' | 'viewer';

interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: AppRole;
  showRoleBadge?: boolean;
}

/**
 * ProtectedPage wrapper for applying RBAC to entire pages
 * Usage: Wrap page content with this component and specify required role
 */
export const ProtectedPage = ({ 
  children, 
  requiredRole = 'viewer',
  showRoleBadge = true
}: ProtectedPageProps) => {
  return (
    <RoleBasedAccess requiredRole={requiredRole} showAccessDenied={true}>
      <div className="relative">
        {showRoleBadge && (
          <div className="absolute top-2 right-2 z-10">
            <RoleBadge />
          </div>
        )}
        {children}
      </div>
    </RoleBasedAccess>
  );
};

/**
 * Hook to get page-level access control helpers
 */
export const usePageAccess = () => {
  const { role, isAdmin, isAnalyst, isViewer, loading, canCreate, canUpdate, canDelete } = useRoleAccess();
  
  return {
    role,
    isAdmin,
    isAnalyst, 
    isViewer,
    loading,
    canCreate,
    canUpdate,
    canDelete,
    // Page-specific access
    canAccessDashboard: isViewer,
    canAccessThreatDetection: isViewer,
    canAccessIncidentResponse: isViewer,
    canAccessAccessControl: isAdmin,
    canAccessComplianceReports: isAnalyst,
    canAccessSystemHealth: isViewer,
    canAccessSentimentAnalysis: isAnalyst,
    canAccessSecurityDashboard: isViewer,
    canAccessPiracyDetection: isAnalyst,
    canAccessThreatInvestigation: isAnalyst,
    canAccessSecurityCompliance: isViewer,
    canAccessNotifications: isViewer,
  };
};
