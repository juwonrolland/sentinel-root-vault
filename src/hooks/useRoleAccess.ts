import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'analyst' | 'viewer';

interface RoleAccess {
  role: AppRole | null;
  isAdmin: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canViewAll: boolean;
  refreshRole: () => Promise<void>;
}

export const useRoleAccess = (): RoleAccess => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserRole = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Check user roles from the user_roles table
      const { data: userRole, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading user role:', error);
      }

      if (userRole) {
        setRole(userRole.role as AppRole);
      } else {
        // Default to viewer if no role assigned
        setRole('viewer');
      }
    } catch (error) {
      console.error('Error in loadUserRole:', error);
      setRole('viewer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = role === 'admin';
  const isAnalyst = role === 'analyst' || role === 'admin';
  const isViewer = role !== null;

  const hasRole = (checkRole: AppRole): boolean => {
    if (!role) return false;
    if (role === 'admin') return true; // Admin has all roles
    if (role === 'analyst' && (checkRole === 'analyst' || checkRole === 'viewer')) return true;
    if (role === 'viewer' && checkRole === 'viewer') return true;
    return false;
  };

  return {
    role,
    isAdmin,
    isAnalyst,
    isViewer,
    loading,
    hasRole,
    canCreate: isAnalyst,
    canUpdate: isAnalyst,
    canDelete: isAdmin,
    canViewAll: isViewer,
    refreshRole: loadUserRole,
  };
};
