-- Auto-activate invitation_status when user logs in for the first time
CREATE OR REPLACE FUNCTION public.auto_activate_on_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.profiles
    SET invitation_status = 'active',
        invite_accepted_at = COALESCE(invite_accepted_at, NEW.last_sign_in_at)
    WHERE id = NEW.id AND invitation_status IN ('invited', 'pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_activate_on_login ON auth.users;
CREATE TRIGGER trg_auto_activate_on_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.auto_activate_on_login();

-- Backfill: fix all users who already logged in but are still 'invited'
UPDATE profiles p SET invitation_status = 'active', invite_accepted_at = u.last_sign_in_at
FROM auth.users u
WHERE u.id = p.id AND p.invitation_status IN ('invited', 'pending') AND u.last_sign_in_at IS NOT NULL;
