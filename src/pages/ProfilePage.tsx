import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_LABELS, ROLE_COLORS } from "@/types/roles";
import { ALL_MODULES, MODULE_LABELS, type PermissionAction } from "@/config/permissions";
import { toast } from "sonner";
import { User, Shield, Lock, CheckCircle, XCircle } from "lucide-react";
import { CalendarManagement } from "@/components/settings/CalendarManagement";

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  export: "Exportar",
};

export default function ProfilePage() {
  const { user, updatePassword } = useAuth();
  const { userRole, permissions } = usePermissions();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const rawPhone = user?.user_metadata?.phone || "";
  // Never show email in phone field (data corruption guard)
  const [phone, setPhone] = useState(rawPhone.includes("@") ? "" : rawPhone);

  // Force refresh session to get updated metadata from server
  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.refreshSession();
      if (data.user) {
        const freshPhone = data.user.user_metadata?.phone || "";
        if (!freshPhone.includes("@")) setPhone(freshPhone);
        setFullName(data.user.user_metadata?.full_name || fullName);
      }
    })();
  }, []);
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleColor = ROLE_COLORS[userRole] || "#888";

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.updateUser({ data: { full_name: fullName, phone } });
      if (user?.id) {
        await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      }
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast.error("A nova senha deve ter no mínimo 6 caracteres."); return; }
    if (newPw !== confirmPw) { toast.error("As senhas não conferem."); return; }
    setChangingPw(true);
    try {
      await updatePassword(newPw);
      toast.success("Senha alterada com sucesso!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar senha.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus dados pessoais e segurança</p>
      </div>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" /> Dados Pessoais</CardTitle>
          <CardDescription>Informações editáveis do seu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>

      {/* Meu Acesso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" /> Meu Acesso</CardTitle>
          <CardDescription>Seu perfil e permissões (somente leitura)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Perfil:</span>
            <Badge
              className="text-xs font-bold"
              style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
            >
              {roleLabel}
            </Badge>
          </div>

          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Módulo</th>
                  {(["view", "create", "edit", "delete", "export"] as PermissionAction[]).map((a) => (
                    <th key={a} className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">{ACTION_LABELS[a]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => {
                  const modPerms = permissions[mod];
                  if (!modPerms) return null;
                  return (
                    <tr key={mod} className="border-b border-border/50">
                      <td className="py-2 px-3 text-foreground">{MODULE_LABELS[mod]}</td>
                      {(["view", "create", "edit", "delete", "export"] as PermissionAction[]).map((a) => (
                        <td key={a} className="text-center py-2 px-2">
                          {modPerms[a] ? (
                            <CheckCircle className="h-4 w-4 text-primary inline-block" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/30 inline-block" />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Para solicitar acesso adicional, entre em contato com o administrador.
          </p>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <CalendarManagement />

      {/* Seguranca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" /> Segurança</CardTitle>
          <CardDescription>Altere sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 max-w-lg">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw} size="sm" variant="outline">
            {changingPw ? "Alterando..." : "Alterar Senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
