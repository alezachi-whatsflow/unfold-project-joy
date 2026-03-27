import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PenLine, Save, Loader2 } from "lucide-react";

const MAX_SIGNATURE_LENGTH = 60;

export function SignatureCard() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("signature_enabled, signature_text")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setEnabled(data.signature_enabled ?? false);
        setText(data.signature_text ?? "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ signature_enabled: enabled, signature_text: text.slice(0, MAX_SIGNATURE_LENGTH) })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao salvar assinatura: " + error.message);
    } else {
      toast.success("Assinatura salva com sucesso!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PenLine className="h-5 w-5" /> Assinatura do Atendente
        </CardTitle>
        <CardDescription>
          Adicione uma assinatura automatica ao final de cada mensagem enviada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Ativar assinatura automatica</p>
            <p className="text-xs text-muted-foreground">
              A assinatura sera adicionada ao final de todas as mensagens
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* Signature text input */}
        <div className="space-y-2">
          <Label htmlFor="signature-text" className="text-sm font-medium">
            Texto da assinatura
          </Label>
          <Input
            id="signature-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_SIGNATURE_LENGTH))}
            placeholder="Ex: Alessandro — Equipe Whatsflow"
            maxLength={MAX_SIGNATURE_LENGTH}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground text-right">
            {text.length}/{MAX_SIGNATURE_LENGTH}
          </p>
        </div>

        {/* Preview */}
        {enabled && text.trim() && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Previa da mensagem</Label>
            <div
              className="rounded-lg p-3 text-sm whitespace-pre-wrap"
              style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            >
              <span className="text-muted-foreground">Ola, tudo bem? Segue o documento solicitado.</span>
              {"\n\n"}
              <span className="font-medium">{"\u2014 "}{text}</span>
            </div>
          </div>
        )}

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Assinatura
        </Button>
      </CardContent>
    </Card>
  );
}
