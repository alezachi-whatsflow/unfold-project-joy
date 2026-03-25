import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag, Search } from "lucide-react";
import { toast } from "sonner";

interface ContactTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  usage_count: number;
  created_at: string;
}

// Check if contact_tags table exists, otherwise use a simple in-memory approach
// The tags are stored as TEXT[] in whatsapp_leads.lead_tags and crm_contacts.tags

export default function ContactTagManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<{ name: string; color: string } | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });

  // Fetch distinct tags from whatsapp_leads and crm_contacts
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["contact-tags", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get tags from crm_contacts
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("tags")
        .eq("tenant_id", tenantId)
        .not("tags", "is", null);

      // Get tags from whatsapp_leads
      const { data: leads } = await supabase
        .from("whatsapp_leads")
        .select("lead_tags");

      // Merge all tags into a frequency map
      const tagMap = new Map<string, number>();
      for (const c of contacts || []) {
        for (const t of (c.tags as string[]) || []) {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        }
      }
      for (const l of leads || []) {
        for (const t of (l.lead_tags as string[]) || []) {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        }
      }

      return Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, usage_count: count }))
        .sort((a, b) => b.usage_count - a.usage_count);
    },
    enabled: !!tenantId,
  });

  const filtered = tags.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  // Colors for tags
  const TAG_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Tags de Contato</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Tags extraídas dos contatos e leads. {tags.length} tags em uso.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <Input placeholder="Buscar tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2 py-2">
        {filtered.slice(0, 30).map((t) => (
          <Badge
            key={t.name}
            className="text-xs px-3 py-1 cursor-default"
            style={{ background: `${getColor(t.name)}20`, color: getColor(t.name), border: `1px solid ${getColor(t.name)}40` }}
          >
            <Tag size={10} className="mr-1" />
            {t.name}
            <span className="ml-1.5 opacity-60">({t.usage_count})</span>
          </Badge>
        ))}
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tag</th>
              <th className="text-right py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Contatos</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={2} className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={2} className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma tag encontrada</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.name} className="border-b" style={{ borderColor: "var(--border-soft, var(--border))" }}>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(t.name) }} />
                      <span style={{ color: "var(--text-primary)" }}>{t.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-2.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t.usage_count}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
