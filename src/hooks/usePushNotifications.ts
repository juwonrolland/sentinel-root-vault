import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationOptions {
  enabled?: boolean;
  onNotificationReceived?: (event: any) => void;
}

export const usePushNotifications = (options: PushNotificationOptions = {}) => {
  const { enabled = true, onNotificationReceived } = options;
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Check if already subscribed
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  }, []);

  // Request permission for push notifications
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setIsSubscribed(true);
        toast({
          title: "Notifications Enabled",
          description: "You will now receive security alerts",
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in browser settings",
          variant: "destructive",
        });
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  // Send a push notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available');
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: true,
        ...options,
      };
      
      const notification = new Notification(title, notificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, permission]);

  // Subscribe to real-time security events
  useEffect(() => {
    if (!enabled || !isSubscribed) return;

    const channel = supabase
      .channel('push-notification-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          const event = payload.new as any;
          
          // Only notify for critical and high severity
          if (event.severity === 'critical' || event.severity === 'high') {
            const severityEmoji = event.severity === 'critical' ? '🚨' : '⚠️';
            
            sendNotification(
              `${severityEmoji} ${event.severity.toUpperCase()} Security Alert`,
              {
                body: `${event.event_type}\n${event.description || 'New security event detected'}`,
                tag: event.id,
                data: event,
              }
            );

            if (onNotificationReceived) {
              onNotificationReceived(event);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, isSubscribed, sendNotification, onNotificationReceived]);

  // Test notification
  const sendTestNotification = useCallback(() => {
    sendNotification('🔔 Test Notification', {
      body: 'Push notifications are working correctly!',
      tag: 'test-notification',
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    sendNotification,
    sendTestNotification,
  };
};
