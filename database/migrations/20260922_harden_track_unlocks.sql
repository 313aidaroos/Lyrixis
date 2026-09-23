-- Harden track_unlocks: service-role writes only, authenticated reads own via view
-- Per Awad billing hardening directive: entitlements must be service-role only

-- Revoke all from public roles
REVOKE ALL ON public.track_unlocks FROM anon;
REVOKE ALL ON public.track_unlocks FROM authenticated;

-- Drop the SELECT policy (will use a view instead)
DROP POLICY IF EXISTS "own unlocks" ON public.track_unlocks;

-- Ensure ONLY service_role can write
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_unlocks TO service_role;

-- Create a view for authenticated users to read their own unlocks
CREATE OR REPLACE VIEW public.my_track_unlocks AS
SELECT recording_public_id, receipt_id, unlocked_at
FROM public.track_unlocks
WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid());

GRANT SELECT ON public.my_track_unlocks TO authenticated;
