-- Create notification history table
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own alert history
CREATE POLICY "Users can view own alert history"
ON public.alert_history
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert alert history
CREATE POLICY "System can insert alert history"
ON public.alert_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own alerts (for acknowledgment)
CREATE POLICY "Users can acknowledge own alerts"
ON public.alert_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_alert_history_user_id ON public.alert_history(user_id);
CREATE INDEX idx_alert_history_created_at ON public.alert_history(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_history;