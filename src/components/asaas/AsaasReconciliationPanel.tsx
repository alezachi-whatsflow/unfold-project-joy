import { useState } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy, fetchAllFromAsaas } from "@/lib/asaasQueries";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  RefreshCw, CheckCircle2, AlertTriangle, ArrowLeftRight, Loader2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface DiffItem {
  asaasId: string;
  field: string;
  localValue: string;
  remoteValue: string;
  type: "mismatch" | "missing_local" | "missing_remote";
}

export function AsaasReconciliationPanel() {
  const { payments, environment } = useAsaas();
  const [running, setRunning] = useState(false);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const runReconciliation = async () => {
    setRunning(true);
    setDiffs([]);
    try {
      // Fetch all payments from Asaas
      const remote = await fetchAllFromAsaas("/payments", environment) as Record<string, unknown>[];
      const localMap = new Map(payments.map((p) => [p.asaas_id, p]));
      const remoteMap = new Map(remote.map((p) => [p.id as string, p]));

      const newDiffs: DiffItem[] = [];

      // Check remote payments against local
      for (const [asaasId, remotePay] of remoteMap) {
        const local = localMap.get(asaasId);
        if (!local) {
          newDiffs.push({
            asaasId,
            field: "registro",
            localValue: "❌ Ausente",
            remoteValue: `${remotePay.status} - ${formatCurrency(remotePay.value as number)}`,
            type: "missing_local",
          });
          continue;
        }

        // Compare key fields
        if (local.status !== remotePay.status) {
          newDiffs.push({
            asaasId,
            field: "status",
            localValue: local.status,
            remoteValue: remotePay.status as string,
            type: "mismatch",
          });
        }
        if (Math.abs(local.value - (remotePay.value as number)) > 0.01) {
          newDiffs.push({
            asaasId,
            field: "valor",
            localValue: formatCurrency(local.value),
            remoteValue: formatCurrency(remotePay.value as number),
            type: "mismatch",
          });
        }
        if (local.due_date !== remotePay.dueDate) {
          newDiffs.push({
            asaasId,
            field: "vencimento",
            localValue: local.due_date,
            remoteValue: remotePay.dueDate as string,
            type: "mismatch",
          });
        }
      }

      // Check local payments not in remote
      for (const [asaasId, local] of localMap) {
        if (!remoteMap.has(asaasId)) {
          newDiffs.push({
            asaasId,
            field: "registro",
            localValue: `${local.status} - ${formatCurrency(local.value)}`,
            remoteValue: "❌ Ausente",
            type: "missing_remote",
          });
        }
      }

      setDiffs(newDiffs);
      setHasRun(true);

      if (newDiffs.length === 0) {
        toast.success("Tudo sincronizado! Nenhuma divergência encontrada.");
      } else {
        toast.warning(`${newDiffs.length} divergência(s) encontrada(s)`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao executar reconciliação");
    } finally {
      setRunning(false);
    }
  };

  const mismatches = diffs.filter((d) => d.type === "mismatch");
  const missingLocal = diffs.filter((d) => d.type === "missing_local");
  const missingRemote = diffs.filter((d) => d.type === "missing_remote");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Reconciliação</h2>
          <p className="text-xs text-muted-foreground">
            Compare dados locais com a API Asaas ({environment})
          </p>
        </div>
        <Button
          onClick={runReconciliation}
          disabled={running}
          className="gap-1.5"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Comparando...</>
          ) : (
            <><ArrowLeftRight className="h-4 w-4" /> Executar Reconciliação</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {hasRun && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <CheckCircle2 className={`h-5 w-5 ${diffs.length === 0 ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">Local</p>
                <p className="font-display text-lg font-bold">{payments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <AlertTriangle className={`h-5 w-5 ${mismatches.length > 0 ? "text-warning" : "text-muted-foreground"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">Divergências</p>
                <p className="font-display text-lg font-bold">{mismatches.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <XCircle className={`h-5 w-5 ${missingLocal.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">Só no Asaas</p>
                <p className="font-display text-lg font-bold">{missingLocal.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <XCircle className={`h-5 w-5 ${missingRemote.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">Só Local</p>
                <p className="font-display text-lg font-bold">{missingRemote.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Diffs Table */}
      {diffs.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Divergências Encontradas
            </CardTitle>
            <CardDescription className="text-xs">
              {diffs.length} diferença(s) entre banco local e Asaas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-xs text-muted-foreground">ID Asaas</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Campo</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Valor Local</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Valor Asaas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffs.slice(0, 100).map((d, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell>
                        <Badge
                          variant={d.type === "mismatch" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {d.type === "mismatch" ? "Divergente" : d.type === "missing_local" ? "Só Asaas" : "Só Local"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{d.asaasId}</TableCell>
                      <TableCell className="text-xs">{d.field}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.localValue}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.remoteValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasRun && diffs.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6 pb-6 justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-sm">Tudo sincronizado!</p>
              <p className="text-xs text-muted-foreground">
                Nenhuma divergência entre o banco local e o Asaas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
