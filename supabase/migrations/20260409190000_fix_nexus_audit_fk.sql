-- Fix: allow deleting nexus_users by setting audit log actor_id to NULL
ALTER TABLE nexus_audit_logs DROP CONSTRAINT IF EXISTS nexus_audit_logs_actor_id_fkey;
ALTER TABLE nexus_audit_logs ADD CONSTRAINT nexus_audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES nexus_users(id) ON DELETE SET NULL;
