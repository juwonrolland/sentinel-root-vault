import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/RoleBasedAccess";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadNotifications();
    setupRealtime();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            toast.info("New notification received");
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => 
              n.id === payload.new.id ? payload.new as Notification : n
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", session?.user?.id)
        .eq("read", false);

      if (error) throw error;
      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to update notifications");
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="icon" className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Bell className="h-6 w-6 md:h-8 md:w-8 text-warning" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Notifications</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">System alerts and updates</p>
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge />
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Mark All Read</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className={notification.read ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {notification.title}
                        {!notification.read && <Badge variant="default">New</Badge>}
                      </CardTitle>
                      <CardDescription>{new Date(notification.created_at).toLocaleString()}</CardDescription>
                    </div>
                    {!notification.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{notification.message}</p>
                  <Badge variant="outline" className="mt-2">{notification.type}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
}