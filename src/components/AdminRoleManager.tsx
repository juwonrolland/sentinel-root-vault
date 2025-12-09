import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Crown, Eye, AlertTriangle, RefreshCw, Check, X } from "lucide-react";
import { AdminOnly } from "@/components/RoleBasedAccess";

type AppRole = 'admin' | 'analyst' | 'viewer';

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

export const AdminRoleManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: (userRole?.role as AppRole) || 'viewer',
          created_at: profile.created_at || '',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    setUpdating(userId);
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const styles = {
      admin: { variant: 'destructive' as const, icon: Crown },
      analyst: { variant: 'default' as const, icon: AlertTriangle },
      viewer: { variant: 'secondary' as const, icon: Eye },
    };

    const config = styles[role];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {role.toUpperCase()}
      </Badge>
    );
  };

  const roleStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    analysts: users.filter(u => u.role === 'analyst').length,
    viewers: users.filter(u => u.role === 'viewer').length,
  };

  return (
    <AdminOnly
      fallback={
        <Card className="cyber-card border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Admin Access Required</h3>
            <p className="text-sm text-muted-foreground text-center">
              Only administrators can manage user roles.
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Role Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total Users
              </CardDescription>
              <CardTitle className="text-2xl">{roleStats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Crown className="h-4 w-4 text-destructive" />
                Admins
              </CardDescription>
              <CardTitle className="text-2xl text-destructive">{roleStats.admins}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Analysts
              </CardDescription>
              <CardTitle className="text-2xl text-warning">{roleStats.analysts}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="cyber-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-primary" />
                Viewers
              </CardDescription>
              <CardTitle className="text-2xl text-primary">{roleStats.viewers}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* User Role Management Table */}
        <Card className="cyber-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  User Role Management
                </CardTitle>
                <CardDescription>Assign and manage user roles and permissions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Change Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || 'No email'}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value as AppRole)}
                            disabled={updating === user.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-3 w-3 text-destructive" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="analyst">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-3 w-3 text-warning" />
                                  Analyst
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-3 w-3 text-primary" />
                                  Viewer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Reference */}
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="text-sm">Role Permissions Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-destructive" />
                  <span className="font-semibold text-destructive">Admin</span>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Full system access</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Manage user roles</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Delete incidents</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Access audit logs</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Configure alerts</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span className="font-semibold text-warning">Analyst</span>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Create incidents</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Update incidents</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Run threat analysis</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Generate reports</li>
                  <li className="flex items-center gap-2"><X className="h-3 w-3 text-destructive" /> Cannot manage roles</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">Viewer</span>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> View dashboards</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> View incidents</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> View reports</li>
                  <li className="flex items-center gap-2"><X className="h-3 w-3 text-destructive" /> Cannot create/edit</li>
                  <li className="flex items-center gap-2"><X className="h-3 w-3 text-destructive" /> Cannot manage</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminOnly>
  );
};

export default AdminRoleManager;
