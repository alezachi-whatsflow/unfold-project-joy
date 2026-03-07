import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from "@/types/roles";
import { ALL_MODULES, MODULE_LABELS, DEFAULT_PERMISSIONS, type PermissionAction, type ModulePermission } from "@/config/permissions";
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
import { Users, UserPlus, Shield, ShieldCheck, Clock, Pencil, RotateCcw, CheckCircle, XCircle } from "lucide-react";

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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Total de Usuários" value={counts.total} />
        <SummaryCard icon={ShieldCheck} label="Administradores" value={counts.admins} />
        <SummaryCard icon={Shield} label="Gestores" value={counts.gestors} />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : profiles.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : profiles.map((p) => {
                const role = (p.role || "consultor") as UserRole;
                const color = ROLE_COLORS[role] || "#888";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                          style={{ width: 32, height: 32, background: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          {(p.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-foreground">{p.full_name || "Sem nome"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-[10px] font-bold"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                      >
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate module="usuarios" action="edit">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditUser(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
      // Use Supabase Auth admin invite (via edge function or signUp)
      const { error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID().slice(0, 12) + "Aa1!", // temp password
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      // Update the profile role once created
      // Small delay to wait for trigger
      setTimeout(async () => {
        await supabase.from("profiles").update({ role }).eq("full_name", name);
      }, 2000);

      toast.success(`Convite enviado para ${email}`);
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
  const [customPerms, setCustomPerms] = useState<Record<string, ModulePermission>>(() => {
    return { ...DEFAULT_PERMISSIONS[currentRole] };
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
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
