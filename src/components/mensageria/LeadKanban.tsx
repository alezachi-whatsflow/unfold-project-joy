import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Loader2, User, Phone, Tag } from "lucide-react";

type Lead = {
  id: string;
  instance_name: string;
  chat_id: string;
  lead_name: string | null;
  lead_full_name: string | null;
  lead_status: string | null;
  is_ticket_open: boolean;
  assigned_attendant_id: string | null;
  lead_tags: string[] | null;
  updated_at: string;
};

const STATUS_COLUMNS = [
  { key: "novo", label: "Novo", color: "bg-blue-500/20" },
  { key: "em_atendimento", label: "Em Atendimento", color: "bg-yellow-500/20" },
  { key: "qualificado", label: "Qualificado", color: "bg-emerald-500/20" },
  { key: "finalizado", label: "Finalizado", color: "bg-muted/30" },
];

export default function LeadKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_leads")
      .select("*")
      .order("kanban_order", { ascending: true });
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const getLeadsByStatus = (status: string) =>
    leads.filter((l) => (l.lead_status || "novo") === status);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    await supabase.from("whatsapp_leads").update({ lead_status: newStatus, updated_at: new Date().toISOString() }).eq("id", leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, lead_status: newStatus } : l));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Lead Kanban (CRM)</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum lead encontrado. Os leads são criados automaticamente quando mensagens são recebidas via webhook.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUS_COLUMNS.map((col) => {
              const colLeads = getLeadsByStatus(col.key);
              return (
                <div key={col.key} className={`p-3 ${col.color} min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{col.label}</h3>
                    <Badge variant="secondary" className="text-[10px]">{colLeads.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {colLeads.map((lead) => (
                      <div key={lead.id} className="bg-card p-3 space-y-2 border border-border/50">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{lead.lead_name || lead.lead_full_name || lead.chat_id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span className="font-mono">{lead.chat_id}</span>
                        </div>
                        {lead.is_ticket_open && (
                          <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Ticket aberto</Badge>
                        )}
                        {lead.lead_tags && lead.lead_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lead.lead_tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px]">
                                <Tag className="h-2.5 w-2.5 mr-0.5" /> {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1 pt-1">
                          {STATUS_COLUMNS.filter((c) => c.key !== (lead.lead_status || "novo")).map((c) => (
                            <Button
                              key={c.key}
                              size="sm"
                              variant="ghost"
                              className="text-[9px] h-6 px-1.5"
                              onClick={() => updateLeadStatus(lead.id, c.key)}
                            >
                              → {c.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
