import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminOnly } from "@/components/RoleBasedAccess";
import { History, RefreshCw, Crown, Eye, AlertTriangle, ArrowRight, Shield } from "lucide-react";
import { format } from "date-fns";

type AppRole = 'admin' | 'analyst' | 'viewer';

interface RoleChangeRecord {
  id: string;
  target_user_id: string;
  changed_by: string;
  old_role: AppRole | null;
  new_role: AppRole;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
  target_user_email?: string;
  changed_by_email?: string;
}

export const RoleChangeAuditTrail = () => {
  const [records, setRecords] = useState<RoleChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      // Get role change records
      const { data: auditRecords, error } = await supabase
        .from('role_change_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (auditRecords && auditRecords.length > 0) {
        // Get unique user IDs to fetch emails
        const userIds = [...new Set([
          ...auditRecords.map(r => r.target_user_id),
          ...auditRecords.map(r => r.changed_by),
        ])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

        const enrichedRecords: RoleChangeRecord[] = auditRecords.map(record => ({
          id: record.id,
          target_user_id: record.target_user_id,
          changed_by: record.changed_by,
          old_role: record.old_role,
          new_role: record.new_role,
          reason: record.reason,
          ip_address: record.ip_address ? String(record.ip_address) : null,
          created_at: record.created_at,
          target_user_email: profileMap.get(record.target_user_id) || 'Unknown',
          changed_by_email: profileMap.get(record.changed_by) || 'Unknown',
        }));

        setRecords(enrichedRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) return <Badge variant="outline" className="text-muted-foreground">None</Badge>;

    const styles = {
      admin: { variant: 'destructive' as const, icon: Crown, color: 'text-destructive' },
      analyst: { variant: 'default' as const, icon: AlertTriangle, color: 'text-warning' },
      viewer: { variant: 'secondary' as const, icon: Eye, color: 'text-primary' },
    };

    const config = styles[role];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {role}
      </Badge>
    );
  };

  return (
    <AdminOnly
      fallback={
        <Card className="cyber-card border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Admin Access Required</h3>
            <p className="text-sm text-muted-foreground text-center">
              Only administrators can view the role change audit trail.
            </p>
          </CardContent>
        </Card>
      }
    >
      <Card className="cyber-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Role Change Audit Trail
              </CardTitle>
              <CardDescription>
                Complete history of all role modifications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAuditTrail} disabled={loading}>
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
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No role changes recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Role Change</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(record.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.target_user_email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(record.old_role)}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getRoleBadge(record.new_role)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.changed_by_email}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {record.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminOnly>
  );
};

export default RoleChangeAuditTrail;