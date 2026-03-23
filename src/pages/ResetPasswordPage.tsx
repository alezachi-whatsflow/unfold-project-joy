import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenType, setTokenType] = useState<"recovery" | "invite" | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setTokenType("recovery");
    } else if (hash.includes("type=invite")) {
      setTokenType("invite");
    } else {
      toast.error("Link inválido ou expirado");
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (password !== confirm) { toast.error("Senhas não coincidem"); return; }
    setLoading(true);
    try {
      await updatePassword(password);

      // Always check if profile needs activation (invite or recovery for new users)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("invitation_status, license_id")
          .eq("id", user.id)
          .maybeSingle();

        // Activate profile if not already active
        if (profile && profile.invitation_status !== "active") {
          await supabase.from("profiles")
            .update({ invitation_status: "active", invite_accepted_at: new Date().toISOString() })
            .eq("id", user.id);

          // Set starts_at on associated license if not already set
          if (profile.license_id) {
            await supabase.from("licenses")
              .update({ starts_at: new Date().toISOString().slice(0, 10) })
              .eq("id", profile.license_id)
              .is("starts_at", null);
          }
        }
      }

      toast.success(tokenType === "invite" ? "Senha criada com sucesso! Bem-vindo(a)!" : "Senha atualizada com sucesso!");

      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Erro ao definir senha");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenType) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            {tokenType === "invite" ? "Criar sua senha" : "Nova senha"}
          </CardTitle>
          <CardDescription>
            {tokenType === "invite"
              ? "Defina uma senha para acessar sua conta"
              : "Redefina sua senha de acesso"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {tokenType === "invite" ? "Sua senha" : "Nova senha"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repita a senha"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tokenType === "invite" ? "Criar senha e entrar" : "Atualizar senha"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
