import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface LicenseLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: string;
}

export function LicenseLimitModal({ open, onOpenChange, resourceType }: LicenseLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Limite do Plano Atingido
          </DialogTitle>
          <DialogDescription>
            Você atingiu o limite de <strong>{resourceType}</strong> do seu plano atual.
            Entre em contato com a Whatsflow para expandir seu plano.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            className="w-full"
            onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Gostaria de expandir meu plano Whatsflow.', '_blank')}
          >
            Falar com Whatsflow
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
