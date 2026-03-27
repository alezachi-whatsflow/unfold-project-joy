import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DigitalAnalysisData,
  generateAnalysisHtml,
  downloadHtmlFile,
  generateFilename,
} from "@/lib/digitalAnalysisHtmlGenerator";
import { useToast } from "@/hooks/use-toast";

interface ExportAnalysisDialogProps {
  analysis: DigitalAnalysisData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportAnalysisDialog({ analysis, open, onOpenChange }: ExportAnalysisDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const filename = generateFilename(analysis.company_name);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const html = generateAnalysisHtml(analysis);
      downloadHtmlFile(html, filename);

      // Log export
      await supabase.from("export_logs").insert({ analysis_id: analysis.id });

      toast({ title: "Exportado!", description: `${filename} foi baixado com sucesso.` });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Export error:", err);
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar Relatório HTML
          </DialogTitle>
          <DialogDescription>
            Confirme para baixar o relatório standalone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="font-medium text-foreground">{analysis.company_name}</p>
          </div>
          <div className="bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Arquivo</p>
            <p className="font-mono text-sm text-foreground">{filename}</p>
          </div>
          <div className="bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Score Geral</p>
            <p className="font-bold text-foreground">{analysis.overall_score.toFixed(1)}/10</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Baixar HTML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
