import { LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AcessoNegadoPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="rounded-full p-5 mb-6" style={{ background: 'rgba(239,68,68,0.10)' }}>
          <LockKeyhole className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-8">
          Você não tem permissão para acessar esta área. Entre em contato com o administrador.
        </p>
        <Button onClick={() => navigate('/')} variant="default">
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
