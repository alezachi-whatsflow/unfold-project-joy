-- Ativar Realtime na whatsapp_leads para eliminar polling no frontend
-- A UI receberá UPDATE events instantaneamente quando:
--   - assigned_attendant_id mudar (operador pega conversa)
--   - lead_status mudar (resolvido, reaberto)
--   - is_ticket_open mudar

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_leads;
