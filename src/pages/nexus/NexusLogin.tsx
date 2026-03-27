import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import whatsflowLogo from '@/assets/whatsflow-logo.png';

export default function NexusLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        toast.error('Credenciais inválidas');
        setLoading(false);
        return;
      }

      // Verify nexus_users membership
      const { data: nexusUser, error: nexusError } = await supabase
        .from('nexus_users')
        .select('id, role, is_active')
        .eq('auth_user_id', authData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (nexusError || !nexusUser) {
        await supabase.auth.signOut();
        toast.error('Acesso não autorizado ao Nexus');
        setLoading(false);
        return;
      }

      // Log login in audit
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser.id,
        actor_role: nexusUser.role,
        action: 'login',
      });

      toast.success('Bem-vindo ao Nexus');
      navigate('/nexus');
    } catch {
      toast.error('Erro ao conectar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      data-theme="forest"
    >
      <Card className="w-full max-w-md mx-4 border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={whatsflowLogo} alt="Whatsflow" className="h-12 w-12" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-xl text-foreground">Whatsflow</CardTitle>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px] font-bold tracking-wider">
              <Shield className="h-3 w-3 mr-1" />
              NEXUS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Painel Administrativo Central
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar no Nexus
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
