import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft, CheckCircle, XCircle, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge, AdminOnly } from "@/components/RoleBasedAccess";
import { AdminRoleManager } from "@/components/AdminRoleManager";
const AccessControl = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    loadLogs();
    loadUsers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from('access_logs')
      .select('*, profiles(full_name, email)')
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (data) setLogs(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role)');
    
    if (data) setUsers(data);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-2 bg-success/10 rounded-lg">
              <Lock className="h-6 w-6 md:h-8 md:w-8 text-success" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Access Control</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Role-based permissions & comprehensive audit logging</p>
            </div>
          </div>
          <RoleBadge />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Admin Role Manager */}
        <div className="mb-8">
          <AdminRoleManager />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Access Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {logs.length > 0 
                  ? `${((logs.filter(l => l.success).length / logs.length) * 100).toFixed(0)}%`
                  : '100%'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>Role-based access control overview</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-semibold">{user.full_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {user.user_roles?.[0]?.role || 'viewer'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Access Logs</CardTitle>
              <CardDescription>Audit trail of system access</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No access logs recorded
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{log.action}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {log.profiles?.email || 'Unknown'} - {log.resource}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Access Log</CardTitle>
            <CardDescription>Complete audit trail with timestamps and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No access logs available
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.profiles?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address || 'N/A'}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AccessControl;