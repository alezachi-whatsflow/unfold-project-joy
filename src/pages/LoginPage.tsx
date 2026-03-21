import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wlSlug = searchParams.get('wl');

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wlConfig, setWlConfig] = useState<any>(null);

  // Load whitelabel branding when ?wl= param is present
  useEffect(() => {
    if (!wlSlug) return;
    supabase
      .from('whitelabel_config')
      .select('display_name, logo_url, primary_color')
      .eq('slug', wlSlug)
      .maybeSingle()
      .then(({ data }) => { if (data) setWlConfig(data); });
  }, [wlSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email.trim(), password);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw userError || new Error("User not found");

      // Get role without broken accounts join
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      const role = profile?.role;

      if (role === 'god_admin' || role === 'god_support') {
        navigate('/god-admin');
      } else if (role === 'wl_admin' || role === 'wl_support') {
        // Route to their whitelabel lab
        const { data: ut } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userData.user.id)
          .limit(1)
          .maybeSingle();

        if (ut?.tenant_id) {
          const { data: lic } = await supabase
            .from('licenses')
            .select('whitelabel_slug')
            .eq('tenant_id', ut.tenant_id)
            .not('whitelabel_slug', 'is', null)
            .maybeSingle();

          if (lic?.whitelabel_slug) {
            navigate(`/lab/${lic.whitelabel_slug}`);
            return;
          }
        }
        navigate('/');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      let errorMessage = "Erro ao fazer login";
      if (err.message === "Invalid login credentials") {
        errorMessage = "Email ou senha incorretos";
      } else if (err.message === "Email not confirmed") {
        errorMessage = "Por favor, confirme seu email antes de entrar";
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = wlConfig?.primary_color || '#11BC76';
  const displayName = wlConfig?.display_name || 'Whatsflow';
  const logoUrl = wlConfig?.logo_url;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden"
            style={{ background: logoUrl ? 'transparent' : primaryColor }}>
            {logoUrl
              ? <img src={logoUrl} alt={displayName} className="h-12 w-12 object-cover rounded-xl" />
              : <span className="font-display text-xl font-bold text-white">{displayName[0]?.toUpperCase()}</span>
            }
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{displayName}</CardTitle>
          <CardDescription>Entre com suas credenciais</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="pr-10" />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}
              style={wlConfig ? { background: primaryColor, borderColor: primaryColor } : undefined}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            <div className="flex w-full justify-between text-sm">
              <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
              <Link to="/forgot-password" className="text-muted-foreground hover:underline">Esqueci a senha</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
