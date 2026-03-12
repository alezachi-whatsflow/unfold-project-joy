export interface FiscalConfig {
  // Identificação
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnaeCodigo: string;
  cnaeDescricao: string;
  regimeTributario: "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";

  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  codigoIbge: string;
  uf: string;

  // Contato
  emailFiscal: string;
  telefoneFiscal: string;

  // NFS-e
  nfseSerie: string;
  nfseProximoNumero: string;
  nfseCodigoServico: string;
  nfseDiscriminacao: string;
  nfseNaturezaOperacao: string;

  // NF-e
  nfeHabilitada: boolean;
  nfeSerie: string;
  nfeProximoNumero: string;

  // E-mail
  enviarNfAutomaticamente: boolean;
  emailAssuntoTemplate: string;
  ccEmailFiscal: boolean;
}

export const defaultFiscalConfig: FiscalConfig = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cnaeCodigo: "",
  cnaeDescricao: "",
  regimeTributario: "simples_nacional",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  codigoIbge: "",
  uf: "",
  emailFiscal: "",
  telefoneFiscal: "",
  nfseSerie: "1",
  nfseProximoNumero: "1",
  nfseCodigoServico: "",
  nfseDiscriminacao: "",
  nfseNaturezaOperacao: "tributacao_municipio",
  nfeHabilitada: false,
  nfeSerie: "1",
  nfeProximoNumero: "1",
  enviarNfAutomaticamente: true,
  emailAssuntoTemplate: "Nota Fiscal - {numero} - {razaoSocial}",
  ccEmailFiscal: true,
};

export { validateCNPJ as validarCNPJ } from "@/lib/cnpjValidation";

export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
