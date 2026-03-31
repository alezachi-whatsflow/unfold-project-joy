import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Building2, MapPin, Phone, FileText, Mail, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  FiscalConfig,
  defaultFiscalConfig,
  validarCNPJ,
  maskCNPJ,
  maskCEP,
  maskPhone,
} from "@/types/fiscalConfig";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

const STORAGE_KEY = "fiscal_configuracoes";

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
];

const NATUREZAS = [
  { value: "tributacao_municipio", label: "Tributação no município" },
  { value: "fora_municipio", label: "Fora do município" },
  { value: "isento", label: "Isento" },
  { value: "imune", label: "Imune" },
];

export default function ConfiguracoesFiscaisTab() {
  const tenantId = useTenantId();
  const [config, setConfig] = useState<FiscalConfig>(defaultFiscalConfig);
  const [saving, setSaving] = useState(false);
  const [cnpjValid, setCnpjValid] = useState<boolean | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  // Load from DB (with localStorage fallback/migration)
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("fiscal_configurations")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setConfig({ ...defaultFiscalConfig, ...data.metadata, cnpj: data.cnpj || "", razaoSocial: data.razao_social || "", nomeFantasia: data.nome_fantasia || "", inscricaoEstadual: data.inscricao_estadual || "", inscricaoMunicipal: data.inscricao_municipal || "", cep: data.cep || "", logradouro: data.logradouro || "", bairro: data.bairro || "", cidade: data.cidade || "", uf: data.uf || "", codigoIbge: data.codigo_ibge || "", regimeTributario: data.regime_tributario || "simples_nacional", ...((data.metadata as any) || {}) });
      } else {
        // Try localStorage migration
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setConfig({ ...defaultFiscalConfig, ...parsed });
          }
        } catch {}
      }
    })();
  }, [tenantId]);

  const update = useCallback(<K extends keyof FiscalConfig>(key: K, value: FiscalConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // CNPJ validation
  useEffect(() => {
    const raw = config.cnpj.replace(/\D/g, "");
    if (raw.length === 14) setCnpjValid(validarCNPJ(config.cnpj));
    else setCnpjValid(null);
  }, [config.cnpj]);

  // CEP lookup
  useEffect(() => {
    const raw = config.cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    let cancelled = false;
    setLoadingCep(true);
    fetch(`https://viacep.com.br/ws/${raw}/json/`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.erro) { setLoadingCep(false); return; }
        setConfig((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
          codigoIbge: data.ibge || prev.codigoIbge,
        }));
        setLoadingCep(false);
      })
      .catch(() => setLoadingCep(false));
    return () => { cancelled = true; };
  }, [config.cep]);

  const handleSave = async () => {
    const raw = config.cnpj.replace(/\D/g, "");
    if (raw.length > 0 && !validarCNPJ(config.cnpj)) {
      toast.error("CNPJ inválido. Verifique os dígitos.");
      return;
    }
    setSaving(true);
    if (tenantId) {
      const { error } = await (supabase as any)
        .from("fiscal_configurations")
        .upsert({
          tenant_id: tenantId,
          cnpj: config.cnpj,
          razao_social: config.razaoSocial,
          nome_fantasia: config.nomeFantasia,
          inscricao_estadual: config.inscricaoEstadual,
          inscricao_municipal: config.inscricaoMunicipal,
          cep: config.cep,
          logradouro: config.logradouro,
          bairro: config.bairro,
          cidade: config.cidade,
          uf: config.uf,
          codigo_ibge: config.codigoIbge,
          regime_tributario: config.regimeTributario,
          metadata: config,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        setSaving(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY); // Clear localStorage after DB save
    }
    setSaving(false);
    toast.success("Configurações fiscais salvas com sucesso");
  };

  return (
    <div className="space-y-5">
      {/* ── Identificação ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Dados da Empresa Emissora
          </CardTitle>
          <CardDescription>Informações cadastrais utilizadas na emissão de notas fiscais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label htmlFor="fc-cnpj">CNPJ</Label>
              <div className="relative">
                <Input
                  id="fc-cnpj"
                  value={config.cnpj}
                  onChange={(e) => update("cnpj", maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {cnpjValid !== null && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {cnpjValid ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
              {cnpjValid === false && <p className="text-xs text-destructive">CNPJ inválido</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-razao">Razão Social</Label>
              <Input id="fc-razao" value={config.razaoSocial} onChange={(e) => update("razaoSocial", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-fantasia">Nome Fantasia</Label>
              <Input id="fc-fantasia" value={config.nomeFantasia} onChange={(e) => update("nomeFantasia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-ie">Inscrição Estadual</Label>
              <Input id="fc-ie" value={config.inscricaoEstadual} onChange={(e) => update("inscricaoEstadual", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-im">Inscrição Municipal</Label>
              <Input id="fc-im" value={config.inscricaoMunicipal} onChange={(e) => update("inscricaoMunicipal", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Regime Tributário</Label>
              <Select value={config.regimeTributario} onValueChange={(v) => update("regimeTributario", v as FiscalConfig["regimeTributario"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIMES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-cnae-code">CNAE — Código</Label>
              <Input id="fc-cnae-code" value={config.cnaeCodigo} onChange={(e) => update("cnaeCodigo", e.target.value)} placeholder="Ex: 6201-5/01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-cnae-desc">CNAE — Descrição</Label>
              <Input id="fc-cnae-desc" value={config.cnaeDescricao} onChange={(e) => update("cnaeDescricao", e.target.value)} placeholder="Desenvolvimento de software" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Endereço ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Endereço Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fc-cep">CEP</Label>
              <div className="relative">
                <Input
                  id="fc-cep"
                  value={config.cep}
                  onChange={(e) => update("cep", maskCEP(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCep && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="fc-logr">Logradouro</Label>
              <Input id="fc-logr" value={config.logradouro} onChange={(e) => update("logradouro", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-num">Número</Label>
              <Input id="fc-num" value={config.numero} onChange={(e) => update("numero", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-compl">Complemento</Label>
              <Input id="fc-compl" value={config.complemento} onChange={(e) => update("complemento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-bairro">Bairro</Label>
              <Input id="fc-bairro" value={config.bairro} onChange={(e) => update("bairro", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-cidade">Cidade</Label>
              <Input id="fc-cidade" value={config.cidade} onChange={(e) => update("cidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-ibge">Código IBGE</Label>
              <Input id="fc-ibge" value={config.codigoIbge} onChange={(e) => update("codigoIbge", e.target.value)} readOnly className="bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-uf">UF</Label>
              <Input id="fc-uf" value={config.uf} onChange={(e) => update("uf", e.target.value)} maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Contato ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Contato Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fc-email">E-mail Fiscal</Label>
              <Input id="fc-email" type="email" value={config.emailFiscal} onChange={(e) => update("emailFiscal", e.target.value)} placeholder="fiscal@empresa.com.br" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-tel">Telefone</Label>
              <Input id="fc-tel" value={config.telefoneFiscal} onChange={(e) => update("telefoneFiscal", maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── NFS-e ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Configurações NFS-e
          </CardTitle>
          <CardDescription>Nota Fiscal de Serviço Eletrônica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fc-nfse-serie">Série</Label>
              <Input id="fc-nfse-serie" value={config.nfseSerie} onChange={(e) => update("nfseSerie", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-nfse-num">Próximo Número</Label>
              <Input id="fc-nfse-num" type="number" step="1" value={config.nfseProximoNumero} onChange={(e) => update("nfseProximoNumero", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-nfse-cod">Código de Serviço (LC 116)</Label>
              <Input id="fc-nfse-cod" value={config.nfseCodigoServico} onChange={(e) => update("nfseCodigoServico", e.target.value)} placeholder="Ex: 01.01" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Natureza da Operação</Label>
            <Select value={config.nfseNaturezaOperacao} onValueChange={(v) => update("nfseNaturezaOperacao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NATUREZAS.map((n) => (<SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fc-nfse-disc">Discriminação Padrão dos Serviços</Label>
            <Textarea id="fc-nfse-disc" rows={3} value={config.nfseDiscriminacao} onChange={(e) => update("nfseDiscriminacao", e.target.value)} placeholder="Modelo de texto para descrição dos serviços na NFS-e..." />
          </div>
        </CardContent>
      </Card>

      {/* ── NF-e ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Configurações NF-e
          </CardTitle>
          <CardDescription>Nota Fiscal de Produto Eletrônica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="fc-nfe-toggle" checked={config.nfeHabilitada} onCheckedChange={(v) => update("nfeHabilitada", v)} />
            <Label htmlFor="fc-nfe-toggle">Habilitar emissão de NF-e</Label>
            <Badge variant={config.nfeHabilitada ? "default" : "secondary"}>{config.nfeHabilitada ? "Ativo" : "Inativo"}</Badge>
          </div>
          {config.nfeHabilitada && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fc-nfe-serie">Série</Label>
                <Input id="fc-nfe-serie" value={config.nfeSerie} onChange={(e) => update("nfeSerie", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fc-nfe-num">Próximo Número</Label>
                <Input id="fc-nfe-num" type="number" step="1" value={config.nfeProximoNumero} onChange={(e) => update("nfeProximoNumero", e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── E-mail ── */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Configurações de E-mail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="fc-email-auto" checked={config.enviarNfAutomaticamente} onCheckedChange={(v) => update("enviarNfAutomaticamente", v)} />
            <Label htmlFor="fc-email-auto">Enviar NF automaticamente ao cliente após emissão</Label>
          </div>
          {config.enviarNfAutomaticamente && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fc-email-assunto">Template do Assunto</Label>
                <Input id="fc-email-assunto" value={config.emailAssuntoTemplate} onChange={(e) => update("emailAssuntoTemplate", e.target.value)} />
                <p className="text-xs text-muted-foreground">Variáveis: {"{numero}"}, {"{razaoSocial}"}, {"{cnpj}"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="fc-email-cc" checked={config.ccEmailFiscal} onCheckedChange={(v) => update("ccEmailFiscal", v)} />
                <Label htmlFor="fc-email-cc">CC para e-mail fiscal da empresa</Label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Salvar ── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando…" : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
