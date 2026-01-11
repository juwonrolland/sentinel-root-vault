import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, Shield, CheckCircle, Loader2, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const GDPRDataDeletion = () => {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const CONFIRM_PHRASE = "DELETE MY DATA";

  const requestDataDeletion = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${CONFIRM_PHRASE}" to confirm`,
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to delete your data",
          variant: "destructive",
        });
        return;
      }

      // Call the delete_user_data function
      const { data, error } = await supabase.rpc('delete_user_data', {
        p_user_id: session.user.id
      });

      if (error) {
        throw error;
      }

      setDeleteResult(data as Record<string, unknown>);

      toast({
        title: "Data Deletion Complete",
        description: "Your personal data has been permanently deleted",
      });

      // Sign out after deletion
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, 3000);

    } catch (error) {
      console.error('Deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="cyber-card border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          GDPR Data Deletion
        </CardTitle>
        <CardDescription>
          Permanently delete all your personal data from our systems (Right to Erasure)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Section */}
        <div className="p-4 border rounded-lg border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive mb-2">⚠️ Warning: This action is irreversible</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>All your personal data will be permanently deleted</li>
                <li>Your profile will be anonymized</li>
                <li>All notifications, logs, and history will be removed</li>
                <li>Your account access will be revoked</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data to be deleted */}
        <div>
          <h4 className="text-sm font-medium mb-3">Data that will be deleted:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              'Profile Information',
              'Email Address',
              'User Roles',
              'Notifications',
              'Access Logs',
              'Alert History',
              'GDPR Requests',
              'Created Incidents',
              'Session Data',
            ].map((category) => (
              <div key={category} className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-3 w-3 text-destructive" />
                {category}
              </div>
            ))}
          </div>
        </div>

        {/* Deletion Result */}
        {deleteResult && (
          <div className="p-4 border rounded-lg border-success/30 bg-success/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <h4 className="font-medium text-success">Deletion Complete</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Your data has been permanently deleted. You will be signed out shortly.
            </p>
          </div>
        )}

        {/* Confirmation Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-delete" className="text-sm">
              Type <span className="font-mono font-bold text-destructive">"{CONFIRM_PHRASE}"</span> to confirm:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Type confirmation phrase..."
              className="mt-2 font-mono"
              disabled={deleting || !!deleteResult}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={confirmText !== CONFIRM_PHRASE || deleting || !!deleteResult}
                className="w-full"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All My Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Final Confirmation
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you absolutely sure you want to delete all your personal data? 
                  This action is permanent and cannot be undone. You will be signed out 
                  and lose access to your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={requestDataDeletion}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Legal Notice */}
        <div className="p-3 border rounded-lg border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Your Rights Under GDPR</p>
              <p className="text-muted-foreground">
                Under GDPR Article 17, you have the right to erasure ("right to be forgotten"). 
                This tool allows you to exercise this right and permanently delete your personal data.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GDPRDataDeletion;
