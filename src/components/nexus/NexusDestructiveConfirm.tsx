import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface NexusDestructiveConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  impactSummary: string[];
  confirmText: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function NexusDestructiveConfirm({
  open, onOpenChange, title, description, impactSummary, confirmText, onConfirm, loading,
}: NexusDestructiveConfirmProps) {
  const [inputValue, setInputValue] = useState("");
  const canConfirm = inputValue === confirmText;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setInputValue(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--nexus-destructive, #ef4444)' }}>
            <AlertTriangle className="h-5 w-5" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {impactSummary.length > 0 && (
          <div
            className="rounded-md p-3 space-y-1 text-sm"
            style={{
              background: 'var(--nexus-destructive-bg, rgba(239,68,68,0.08))',
              border: '0.5px solid var(--nexus-destructive-border, rgba(239,68,68,0.25))',
            }}
          >
            <p className="font-semibold text-xs" style={{ color: 'var(--nexus-destructive, #ef4444)' }}>
              Impacto em cascata:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {impactSummary.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground">{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Digite <strong className="text-foreground">{confirmText}</strong> para confirmar:
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); setInputValue(""); }}
            disabled={!canConfirm || loading}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
