import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePipelines } from "@/hooks/usePipelines";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, X, Plus, Loader2, Download, Users, Tag } from "lucide-react";

interface CsvContact {
  name: string;
  company: string;
  phone: string;
  extra: string;
}

const MAX_TAGS = 5;

export function CrmCSVImport() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(tenantId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<CsvContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("none");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [stage, setStage] = useState("lead");

  const STAGES = [
    { value: "lead", label: "Lead" },
    { value: "prospect", label: "Prospect" },
    { value: "customer", label: "Cliente" },
  ];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      // skip header if first line looks like header
      const start = /nome/i.test(lines[0]) ? 1 : 0;
      const contacts: CsvContact[] = [];
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(/[;,\t]/);
        if (!cols[0]?.trim()) continue;
        contacts.push({
          name: cols[0]?.trim() || "",
          company: cols[1]?.trim() || "",
          phone: cols[2]?.trim() || "",
          extra: cols[3]?.trim() || "",
        });
      }
      setParsed(contacts);
    };
    reader.readAsText(file, "UTF-8");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.length >= MAX_TAGS || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !parsed.length) throw new Error("Sem dados para importar");

      // 1) Insert CRM contacts
      const contactRows = parsed.map((c) => ({
        tenant_id: tenantId,
        name: c.name,
        company: c.company || null,
        phone: c.phone || null,
        notes: c.extra || null,
        stage,
        source: "csv_import",
        tags: tags.length ? tags : [],
      }));

      const CHUNK = 200;
      const insertedIds: string[] = [];
      for (let i = 0; i < contactRows.length; i += CHUNK) {
        const chunk = contactRows.slice(i, i + CHUNK);
        const { data, error } = await supabase.from("crm_contacts").insert(chunk).select("id");
        if (error) throw error;
        if (data) insertedIds.push(...data.map((d: any) => d.id));
      }

      // 2) If pipeline selected, create negocio for each contact
      if (selectedPipelineId !== "none") {
        const pipeline = pipelines.find((p) => p.id === selectedPipelineId);
        const firstStage = pipeline?.stages?.find((s: any) => s.enabled && s.ordem === 1)?.key || "prospeccao";

        const negocioRows = parsed.map((c, idx) => ({
          tenant_id: tenantId,
          titulo: c.name,
          status: firstStage,
          origem: "inbound" as const,
          cliente_nome: c.name,
          pipeline_id: selectedPipelineId,
          tags: tags.length ? tags : [],
          valor_total: 0,
          valor_liquido: 0,
        }));

        for (let i = 0; i < negocioRows.length; i += CHUNK) {
          const chunk = negocioRows.slice(i, i + CHUNK);
          const { error } = await supabase.from("negocios").insert(chunk);
          if (error) throw error;
        }
      }

      return insertedIds.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} contatos importados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["negocios"] });
      setParsed([]);
      setFileName("");
      setTags([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const csv = "NOME CONTATO;EMPRESA;FONE WHATSAPP;COLUNA EXTRA\nJoão Silva;Empresa X;5511999887766;Observação\nMaria Santos;Empresa Y;5521988776655;VIP";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-contatos-crm.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Config */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              Importar Contatos CRM via CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                Formato: <strong>NOME;EMPRESA;FONE;EXTRA</strong> (separado por ; ou ,)
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Selecionar CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Modelo
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              {fileName && <p className="text-xs text-primary mt-2">{fileName} — {parsed.length} contatos</p>}
            </div>

            <div>
              <Label className="text-xs">Estágio inicial</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Configurações de Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Vincular ao Pipeline (opcional)</Label>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum — só criar contatos</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Se selecionado, cria um card no pipeline para cada contato
              </p>
            </div>

            <div>
              <Label className="text-xs">Tags (máx. {MAX_TAGS})</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1"
                  maxLength={30}
                />
                <Button variant="outline" size="icon" onClick={addTag} disabled={tags.length >= MAX_TAGS}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs gap-1">
                      {t}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => importMutation.mutate()}
              disabled={!parsed.length || importMutation.isPending || !tenantId}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Importar {parsed.length} Contatos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      {parsed.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pré-visualização ({parsed.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Nome Contato</TableHead>
                    <TableHead className="text-xs">Empresa</TableHead>
                    <TableHead className="text-xs">Fone WhatsApp</TableHead>
                    <TableHead className="text-xs">Extra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs">{c.company || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{c.phone || "—"}</TableCell>
                      <TableCell className="text-xs">{c.extra || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsed.length > 50 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Mostrando 50 de {parsed.length} registros
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
