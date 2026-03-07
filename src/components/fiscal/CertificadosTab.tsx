import { useState, useEffect } from "react";
import { Certificate, CertificateEnvironment } from "@/types/certificates";
import CertificateStatusCards from "./certificates/CertificateStatusCards";
import CertificateUploadCard from "./certificates/CertificateUploadCard";
import CertificateTable from "./certificates/CertificateTable";
import EnvironmentToggle from "./certificates/EnvironmentToggle";
import ExpiryAlert from "./certificates/ExpiryAlert";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "fiscal_certificados";
const ENV_KEY = "fiscal_cert_environment";

function loadCerts(): Certificate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function loadEnv(): CertificateEnvironment {
  return (localStorage.getItem(ENV_KEY) as CertificateEnvironment) || "homologacao";
}

export default function CertificadosTab() {
  const [certificates, setCertificates] = useState<Certificate[]>(loadCerts);
  const [environment, setEnvironment] = useState<CertificateEnvironment>(loadEnv);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates)); }, [certificates]);
  useEffect(() => { localStorage.setItem(ENV_KEY, environment); }, [environment]);

  const activeCert = certificates.find((c) => c.status === "ativo") || null;

  const handleAdd = (cert: Certificate) => {
    // Set previous active certs to "vencido" concept – keep only one active
    setCertificates((prev) =>
      [...prev.map((c) => (c.status === "ativo" ? { ...c, status: "vencido" as const } : c)), cert]
    );
  };

  const handleRevoke = (id: string) => {
    setCertificates((prev) => prev.map((c) => (c.id === id ? { ...c, status: "revogado" as const } : c)));
    toast.info("Certificado revogado.");
  };

  const handleRenew = (_id: string) => {
    // Scroll to upload section
    document.getElementById("cert-upload")?.scrollIntoView({ behavior: "smooth" });
    toast.info("Faça o upload do novo certificado abaixo.");
  };

  return (
    <div className="space-y-5">
      <ExpiryAlert activeCert={activeCert} />
      <CertificateStatusCards activeCert={activeCert} />
      <div id="cert-upload">
        <CertificateUploadCard onCertificateValidated={handleAdd} />
      </div>
      <CertificateTable certificates={certificates} onRevoke={handleRevoke} onRenew={handleRenew} />
      <EnvironmentToggle environment={environment} onChange={setEnvironment} />
    </div>
  );
}
