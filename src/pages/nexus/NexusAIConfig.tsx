import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Bot, Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle2, XCircle, Globe, Building2 } from "lucide-react";

interface AIConfig {
  id: string;
  tenant_id: string | null;
  name: string;
  provider: string;
  api_key: string;
  project_id: string | null;
  model: string;
  is_active: boolean;
  is_global: boolean;
  created_at: string;
  tenants?: { name: string } | null;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest", "claude-3-opus-latest"] },
  { value: "gemini", label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
];

export default function NexusAIConfig() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AIConfig | null>(null);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ai-configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_configurations")
        .select("*, tenants(name)")
        .order("is_global", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AIConfig[];
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["all-tenants-for-ai"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name").order("name");
      return data || [];
    },
  });

  const globalConfigs = configs.filter(c => c.is_global);
  const tenantConfigs = configs.filter(c => !c.is_global);

  const toggleKey = (id: string) => {
    setShowKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.substring(0, 8) + "..." + key.substring(key.length - 4);

  const handleDelete = async (config: AIConfig) => {
    if (!confirm(`Remover configuração "${config.name}"?`)) return;
    const { error } = await supabase.from("ai_configurations").delete().eq("id", config.id);
    if (error) toast.error(error.message);
    else { toast.success("Configuração removida"); queryClient.invalidateQueries({ queryKey: ["ai-configurations"] }); }
  };

  const handleToggleActive = async (config: AIConfig) => {
    const { error } = await supabase.from("ai_configurations").update({ is_active: !config.is_active }).eq("id", config.id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["ai-configurations"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> Configuração de I.A.
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie as API keys de OpenAI, Anthropic e Gemini para os tenants.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Configuração
        </Button>
      </div>

      {/* Global Configs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" /> Configurações Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {globalConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma configuração global. Crie uma para que todos os tenants usem.</p>
          ) : (
            <ConfigTable configs={globalConfigs} showKeys={showKeys} toggleKey={toggleKey} maskKey={maskKey}
              onEdit={(c) => { setEditing(c); setDialogOpen(true); }} onDelete={handleDelete} onToggle={handleToggleActive} />
          )}
        </CardContent>
      </Card>

      {/* Per-Tenant Configs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" /> Configurações por Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenantConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma configuração específica por tenant. Tenants usarão a global.</p>
          ) : (
            <ConfigTable configs={tenantConfigs} showKeys={showKeys} toggleKey={toggleKey} maskKey={maskKey}
              onEdit={(c) => { setEditing(c); setDialogOpen(true); }} onDelete={handleDelete} onToggle={handleToggleActive} />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AIConfigDialog
        open={dialogOpen}
        editing={editing}
        tenants={tenants}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSaved={() => { setDialogOpen(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["ai-configurations"] }); }}
      />
    </div>
  );
}

// ─── CONFIG TABLE ─────────────────────────────────────────────────────────────
function ConfigTable({ configs, showKeys, toggleKey, maskKey, onEdit, onDelete, onToggle }: {
  configs: AIConfig[];
  showKeys: Set<string>;
  toggleKey: (id: string) => void;
  maskKey: (key: string) => string;
  onEdit: (c: AIConfig) => void;
  onDelete: (c: AIConfig) => void;
  onToggle: (c: AIConfig) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Modelo</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead>API Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {configs.map(c => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-[10px] uppercase">{c.provider}</Badge>
            </TableCell>
            <TableCell className="text-xs font-mono">{c.model}</TableCell>
            <TableCell className="text-xs">
              {c.is_global ? <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Global</Badge> : (c.tenants?.name || "—")}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono">{showKeys.has(c.id) ? c.api_key : maskKey(c.api_key)}</span>
                <button onClick={() => toggleKey(c.id)} className="text-muted-foreground hover:text-foreground">
                  {showKeys.has(c.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </TableCell>
            <TableCell>
              <button onClick={() => onToggle(c)}>
                {c.is_active
                  ? <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] cursor-pointer"><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</Badge>
                  : <Badge className="bg-muted text-muted-foreground border-border text-[10px] cursor-pointer"><XCircle className="h-3 w-3 mr-1" />Inativo</Badge>}
              </button>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── ADD/EDIT DIALOG ──────────────────────────────────────────────────────────
function AIConfigDialog({ open, editing, tenants, onClose, onSaved }: {
  open: boolean;
  editing: AIConfig | null;
  tenants: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name || "OpenAI Principal");
  const [provider, setProvider] = useState(editing?.provider || "openai");
  const [model, setModel] = useState(editing?.model || "gpt-4o");
  const [apiKey, setApiKey] = useState(editing?.api_key || "");
  const [projectId, setProjectId] = useState(editing?.project_id || "");
  const [tenantId, setTenantId] = useState(editing?.tenant_id || "__global__");
  const [saving, setSaving] = useState(false);

  // Reset form when editing changes
  const resetForm = () => {
    setName(editing?.name || "OpenAI Principal");
    setProvider(editing?.provider || "openai");
    setModel(editing?.model || "gpt-4o");
    setApiKey(editing?.api_key || "");
    setProjectId(editing?.project_id || "");
    setTenantId(editing?.tenant_id || "__global__");
  };

  const providerConfig = PROVIDERS.find(p => p.value === provider);

  const handleSave = async () => {
    if (!apiKey.trim()) { toast.error("API Key é obrigatória"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        provider,
        model,
        api_key: apiKey.trim(),
        project_id: projectId.trim() || null,
        tenant_id: tenantId === "__global__" ? null : tenantId,
        is_global: tenantId === "__global__",
      };

      if (editing) {
        const { error } = await supabase.from("ai_configurations").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Configuração atualizada");
      } else {
        const { error } = await supabase.from("ai_configurations").insert(payload);
        if (error) throw error;
        toast.success("Configuração criada");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Configuração de I.A." : "Nova Configuração de I.A."}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da I.A.</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Assistente Virtual" />
            </div>
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">
                    <span className="flex items-center gap-2"><Globe className="h-3 w-3 text-blue-400" /> Global (todos os tenants)</span>
                  </SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={v => { setProvider(v); setModel(PROVIDERS.find(p => p.value === v)?.models[0] || ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(providerConfig?.models || []).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {provider === "openai" && (
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="proj_..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-proj-..." : provider === "anthropic" ? "sk-ant-..." : "AIza..."}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar Configuração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
