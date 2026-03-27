import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, QrCode, FileText } from "lucide-react";
import type { CreationResult } from "../AsaasBillingManagerPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CreationResult | null;
}

export function PaymentArtifactsDialog({ open, onOpenChange, result }: Props) {
  if (!result || result.status !== "success") return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Cobrança Criada
            <Badge variant="default" className="text-[10px]">
              {result.asaasId}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {result.customer}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pix QR Code */}
          {result.pixQrCodeImage && (
            <div className="space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-primary" />
                Pix QR Code
              </p>
              <div className="flex justify-center border border-border bg-white p-4">
                <img
                  src={`data:image/png;base64,${result.pixQrCodeImage}`}
                  alt="QR Code Pix"
                  className="h-48 w-48"
                />
              </div>
            </div>
          )}

          {/* Pix Copy-Paste */}
          {result.pixCopyPaste && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Pix Copia e Cola</p>
              <div className="flex gap-2">
                <div className="flex-1 border border-border bg-muted/50 p-2 text-[10px] font-mono break-all max-h-20 overflow-y-auto">
                  {result.pixCopyPaste}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(result.pixCopyPaste!, "Pix Copia e Cola")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Boleto / Invoice Links */}
          <div className="flex flex-wrap gap-2">
            {result.bankSlipUrl && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <a href={result.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5" />
                  Ver Boleto
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {result.invoiceUrl && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <a href={result.invoiceUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5" />
                  Ver Fatura
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
