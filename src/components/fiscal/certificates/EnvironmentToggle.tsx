import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Server } from "lucide-react";
import { CertificateEnvironment } from "@/types/certificates";

interface Props {
  environment: CertificateEnvironment;
  onChange: (env: CertificateEnvironment) => void;
}

export default function EnvironmentToggle({ environment, onChange }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isProduction = environment === "producao";

  const handleToggle = () => {
    if (!isProduction) {
      setShowConfirm(true);
    } else {
      onChange("homologacao");
    }
  };

  return (
    <>
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" /> Ambiente de Emissão
          </CardTitle>
          <CardDescription>Selecione entre homologação (testes) e produção</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="env-toggle" checked={isProduction} onCheckedChange={handleToggle} />
              <Label htmlFor="env-toggle" className="cursor-pointer">
                {isProduction ? "Produção" : "Homologação"}
              </Label>
            </div>
            <Badge variant={isProduction ? "destructive" : "secondary"}>
              {isProduction ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar ambiente de Produção?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao ativar o ambiente de produção, as notas fiscais emitidas terão validade jurídica. Certifique-se de que o certificado digital está correto e válido antes de prosseguir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onChange("producao"); setShowConfirm(false); }}>
              Confirmar Produção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
