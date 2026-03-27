import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Eye, EyeOff, CheckCircle2, XCircle, FileKey } from "lucide-react";
import { Certificate } from "@/types/certificates";
import { toast } from "@/components/ui/sonner";

interface Props {
  onCertificateValidated: (cert: Certificate) => void;
}

const EMISSORAS = ["Serpro", "Certisign", "Valid", "Serasa", "AC Soluti", "Safeweb"];

function generateMockMeta(fileName: string) {
  const randomCnpj = `${String(Math.floor(Math.random() * 100)).padStart(2, "0")}.${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}.${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}/0001-${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  futureDate.setMonth(futureDate.getMonth() + Math.floor(Math.random() * 6));
  return {
    cnpj: randomCnpj,
    razaoSocial: fileName.replace(/\.(pfx|p12)$/i, "").replace(/[_-]/g, " "),
    emissora: EMISSORAS[Math.floor(Math.random() * EMISSORAS.length)],
    validoAte: futureDate.toISOString().split("T")[0],
  };
}

export default function CertificateUploadCard({ onCertificateValidated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; meta?: ReturnType<typeof generateMockMeta>; error?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "pfx" && ext !== "p12") {
      toast.error("Formato inválido. Aceitos: .pfx ou .p12");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleValidate = async () => {
    if (!file) return;
    if (!password) { toast.error("Informe a senha do certificado"); return; }
    setValidating(true);
    // Simulate validation
    await new Promise((r) => setTimeout(r, 1200));
    if (password.length < 3) {
      setResult({ success: false, error: "Senha incorreta ou certificado inválido." });
      setValidating(false);
      return;
    }
    const meta = generateMockMeta(file.name);
    setResult({ success: true, meta });
    setValidating(false);
  };

  const handleConfirm = () => {
    if (!result?.meta) return;
    const cert: Certificate = {
      id: crypto.randomUUID(),
      cnpj: result.meta.cnpj,
      razaoSocial: result.meta.razaoSocial,
      tipo: "A1",
      emissora: result.meta.emissora,
      validoAte: result.meta.validoAte,
      status: "ativo",
      fileName: file?.name,
    };
    onCertificateValidated(cert);
    setFile(null);
    setPassword("");
    setResult(null);
    toast.success("Certificado cadastrado com sucesso!");
  };

  return (
    <Card className="border-border/40" style={{ borderRadius: 12 }}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileKey className="h-4 w-4 text-primary" /> Upload de Certificado A1
        </CardTitle>
        <CardDescription>Arraste o arquivo .pfx ou .p12 e informe a senha para validação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pfx,.p12"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          {file ? (
            <p className="text-sm font-medium text-foreground">{file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span></p>
          ) : (
            <p className="text-sm text-muted-foreground">Clique ou arraste o arquivo .pfx / .p12 aqui</p>
          )}
        </div>

        {file && (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="cert-pw">Senha do Certificado</Label>
              <div className="relative">
                <Input
                  id="cert-pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleValidate} disabled={validating}>
              {validating ? "Validando…" : "Validar Certificado"}
            </Button>
          </div>
        )}

        {result && (
          <div className={`p-4 border ${result.success ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
            {result.success && result.meta ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Certificado válido</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">CNPJ:</span> <span className="text-foreground">{result.meta.cnpj}</span></div>
                  <div><span className="text-muted-foreground">Razão Social:</span> <span className="text-foreground">{result.meta.razaoSocial}</span></div>
                  <div><span className="text-muted-foreground">Validade:</span> <span className="text-foreground">{new Date(result.meta.validoAte).toLocaleDateString("pt-BR")}</span></div>
                  <div><span className="text-muted-foreground">Emissora:</span> <span className="text-foreground">{result.meta.emissora}</span></div>
                </div>
                <Button onClick={handleConfirm} className="mt-3 w-full sm:w-auto">Cadastrar Certificado</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-destructive">{result.error}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
