-- Fix: Remove the ALL policy that allows users to SELECT session tokens
-- Replace with granular INSERT/UPDATE/DELETE only (no SELECT)

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.active_sessions;

-- Users can INSERT their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.active_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own sessions (for last_activity etc)
CREATE POLICY "Users can update own sessions"
ON public.active_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can DELETE their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
ON public.active_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);