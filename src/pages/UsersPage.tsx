import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from "@/types/roles";
import { ALL_MODULES, MODULE_LABELS, DEFAULT_PERMISSIONS, type PermissionAction, type ModulePermission, type PermissionMatrix } from "@/config/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, UserPlus, Shield, ShieldCheck, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { InvitationTimeline } from "@/components/users/InvitationTimeline";

const ROLES: UserRole[] = ["admin", "gestor", "financeiro", "consultor", "representante"];
const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "export"];
const ACTION_LABELS: Record<PermissionAction, string> = { view: "Ver", create: "Criar", edit: "Editar", delete: "Excluir", export: "Exportar" };

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  custom_permissions: any;
  invitation_status: string | null;
  invited_at: string | null;
  invite_accepted_at: string | null;
  invited_by: string | null;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const counts = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter((p) => p.role === "admin").length;
    const gestors = profiles.filter((p) => p.role === "gestor").length;
    return { total, admins, gestors };
  }, [profiles]);

  const handleDeleteUser = async (profile: ProfileRow) => {
    if (profile.id === user?.id) {
      toast.error("Você não pode remover a si mesmo.");
      return;
    }
    if (!confirm(`Remover o usuário "${profile.full_name || 'Sem nome'}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
      if (error) throw error;
      toast.success("Usuário removido.");
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover usuário.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários & Permissões</h1>
          <p className="text-sm text-muted-foreground">Gerencie os acessos da equipe ao Whatsflow Finance</p>
        </div>
        <PermissionGate module="usuarios" action="create">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> Convidar Usuário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <InviteUserForm onClose={() => { setInviteOpen(false); queryClient.invalidateQueries({ queryKey: ["all-profiles"] }); }} />
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {/* Metric Pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted text-foreground text-sm font-semibold">
          <span className="text-lg font-bold">{counts.total}</span>
          <span className="opacity-80">Total</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
          <span className="text-lg font-bold">{profiles.filter(p => p.invitation_status === 'active').length}</span>
          <span className="opacity-80">Ativos</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400 text-sm font-semibold">
          <span className="text-lg font-bold">{profiles.filter(p => p.invitation_status === 'invited' || p.invitation_status === 'accepted').length}</span>
          <span className="opacity-80">Pendentes</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted text-muted-foreground text-sm font-semibold">
          <span className="text-lg font-bold">{profiles.filter(p => !p.invitation_status || p.invitation_status === 'inactive').length}</span>
          <span className="opacity-80">Inativos</span>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[var(--radius)] bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => {
            const role = (p.role || "consultor") as UserRole;
            const color = ROLE_COLORS[role] || "#888";
            const invStatus = (p.invitation_status || "active") as "pending" | "invited" | "accepted" | "active";
            const statusOrder: Record<string, number> = { pending: 0, invited: 1, accepted: 2, active: 3 };
            const current = statusOrder[invStatus] ?? 0;
            const steps = [
              { key: 'invited', label: 'Convite Enviado' },
              { key: 'accepted', label: 'Link Acessado' },
              { key: 'active', label: 'Conta Ativa' },
            ];

            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius)] bg-card border border-border">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span
                    className="flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 w-9 h-9"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {(p.full_name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground text-sm leading-tight">{p.full_name || "Sem nome"}</span>
                    <Badge
                      className="text-[10px] font-bold w-fit"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                    >
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {steps.map((step) => {
                    const isComplete = current >= statusOrder[step.key];
                    return (
                      <span
                        key={step.key}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border ${
                          isComplete
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-muted/50 text-muted-foreground/40 border-border'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                        {step.label}
                      </span>
                    );
                  })}
                </div>

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                </span>

                <div className="flex items-center gap-2">
                  <PermissionGate module="usuarios" action="edit">
                    <button
                      onClick={() => setEditUser(p)}
                      className="w-7 h-7 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="usuarios" action="delete">
                    <button
                      onClick={() => handleDeleteUser(p)}
                      className="w-7 h-7 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <EditUserForm
              profile={editUser}
              currentUserId={user?.id || ""}
              isAdmin={isAdmin}
              onClose={() => { setEditUser(null); queryClient.invalidateQueries({ queryKey: ["all-profiles"] }); }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function InviteUserForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("consultor");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!name || !email) { toast.error("Preencha nome e e-mail."); return; }
    setLoading(true);
    try {
      // Get current tenant from localStorage or user_tenants
      const tenantId = localStorage.getItem("whatsflow_default_tenant_id") || undefined;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email,
            full_name: name,
            role,
            tenant_id: tenantId,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao convidar usuário.");

      toast.success(result.message || `Convite enviado para ${email}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao convidar usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Convidar Novo Usuário</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Perfil base</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[r] }} />
                    {ROLE_LABELS[r]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Um e-mail de convite será enviado automaticamente. O usuário poderá criar sua conta clicando no link recebido, sem necessidade de pedir autorização.
        </p>
        <Button onClick={handleInvite} disabled={loading} className="w-full">
          {loading ? "Enviando..." : "Enviar Convite"}
        </Button>
      </div>
    </>
  );
}

function EditUserForm({ profile, currentUserId, isAdmin, onClose }: {
  profile: ProfileRow;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const isSelf = profile.id === currentUserId;
  const currentRole = (profile.role || "consultor") as UserRole;
  const [role, setRole] = useState<UserRole>(currentRole);

  // Initialize custom permissions from saved data or defaults
  const [customPerms, setCustomPerms] = useState<Record<string, ModulePermission>>(() => {
    const base = { ...DEFAULT_PERMISSIONS[currentRole] };
    const saved = profile.custom_permissions as PermissionMatrix | null;
    if (saved && typeof saved === 'object') {
      // Merge saved over base
      for (const mod of Object.keys(saved)) {
        if (base[mod]) {
          base[mod] = { ...base[mod], ...saved[mod] };
        }
      }
    }
    return base;
  });
  const [saving, setSaving] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    if (isSelf && newRole !== "admin") {
      toast.error("Você não pode remover seu próprio acesso administrativo.");
      return;
    }
    setRole(newRole);
    setCustomPerms({ ...DEFAULT_PERMISSIONS[newRole] });
  };

  const togglePerm = (mod: string, action: PermissionAction) => {
    if (isSelf && mod === "usuarios" && action === "view") {
      toast.error("Você não pode remover seu próprio acesso a Usuários.");
      return;
    }
    setCustomPerms((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] },
    }));
  };

  const resetToDefault = () => {
    setCustomPerms({ ...DEFAULT_PERMISSIONS[role] });
    toast.info("Permissões restauradas para o padrão do perfil.");
  };

  // Check if permissions differ from role defaults
  const hasCustomOverrides = useMemo(() => {
    const defaults = DEFAULT_PERMISSIONS[role];
    for (const mod of Object.keys(defaults)) {
      for (const act of ACTIONS) {
        if (customPerms[mod]?.[act] !== defaults[mod]?.[act]) return true;
      }
    }
    return false;
  }, [role, customPerms]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = { role };
      // Only save custom_permissions if they differ from defaults
      if (hasCustomOverrides) {
        updateData.custom_permissions = customPerms;
      } else {
        updateData.custom_permissions = null;
      }
      const { error } = await supabase.from("profiles").update(updateData).eq("id", profile.id);
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Usuário — {profile.full_name || "Sem nome"}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="perfil" className="mt-2">
        <TabsList className="w-full">
          <TabsTrigger value="perfil" className="flex-1">Perfil Base</TabsTrigger>
          <TabsTrigger value="permissoes" className="flex-1">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Perfil base</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[r] }} />
                      {ROLE_LABELS[r]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            As permissões na aba "Permissões" são baseadas no perfil selecionado. Você pode personalizá-las individualmente.
          </p>
        </TabsContent>

        <TabsContent value="permissoes" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Toggles individuais por módulo e ação</p>
            <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Resetar para padrão
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Módulo</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">{ACTION_LABELS[a]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => (
                  <tr key={mod} className="border-b border-border/50">
                    <td className="py-2 px-3 text-foreground text-xs font-medium">{MODULE_LABELS[mod]}</td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="text-center py-1.5 px-2">
                        <Switch
                          checked={customPerms[mod]?.[a] ?? false}
                          onCheckedChange={() => togglePerm(mod, a)}
                          className="scale-75"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Permissões"}
        </Button>
      </div>
    </>
  );
}
