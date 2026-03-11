import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { chatService } from "@/services/chatService";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ContactChecker() {
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    supabase.from("whatsapp_instances").select("*").eq("provedor", "uazapi").eq("status", "connected")
      .then(({ data }) => { if (data) setInstances(data); });
  }, []);

  const handleCheck = async () => {
    if (!selectedInstance || !numbersText.trim()) {
      toast.error("Selecione uma instância e informe os números.");
      return;
    }
    setChecking(true);
    setResults(null);
    try {
      const numbers = numbersText.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
      const data = await chatService.checkNumbers(selectedInstance, numbers);
      setResults(Array.isArray(data) ? data : data?.results || []);
      toast.success(`${numbers.length} números verificados!`);
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Erro desconhecido"));
    } finally {
      setChecking(false);
    }
  };

  const validCount = results?.filter((r) => r.hasWhatsApp || r.exists).length ?? 0;
  const invalidCount = (results?.length ?? 0) - validCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" /> Verificar Números no WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Instância conectada</Label>
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {instances.map((i) => (
                <SelectItem key={i.instance_name} value={i.instance_name}>
                  {i.profile_name || i.label || i.instance_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Números (um por linha ou separados por vírgula)</Label>
          <Textarea
            placeholder="5511999999999&#10;5521888888888&#10;5531777777777"
            value={numbersText}
            onChange={(e) => setNumbersText(e.target.value)}
            rows={5}
          />
        </div>

        <Button onClick={handleCheck} disabled={checking} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verificar no WhatsApp
        </Button>

        {results && (
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">🟢 {validCount} com WhatsApp</Badge>
              <Badge variant="secondary" className="bg-red-500/20 text-red-400">🔴 {invalidCount} sem WhatsApp</Badge>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {results.map((r, i) => {
                const has = r.hasWhatsApp || r.exists;
                return (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                    <span className="font-mono">{r.number || r.phone || r.jid}</span>
                    <div className="flex items-center gap-2">
                      {r.name && <span className="text-muted-foreground">{r.name}</span>}
                      {has ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
