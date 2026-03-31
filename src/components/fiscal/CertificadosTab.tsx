import { useState, useEffect } from "react";
import { Certificate, CertificateEnvironment } from "@/types/certificates";
import CertificateStatusCards from "./certificates/CertificateStatusCards";
import CertificateUploadCard from "./certificates/CertificateUploadCard";
import CertificateTable from "./certificates/CertificateTable";
import EnvironmentToggle from "./certificates/EnvironmentToggle";
import ExpiryAlert from "./certificates/ExpiryAlert";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

const STORAGE_KEY = "fiscal_certificados";
const ENV_KEY = "fiscal_cert_environment";

export default function CertificadosTab() {
  const tenantId = useTenantId();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [environment, setEnvironment] = useState<CertificateEnvironment>("homologacao");

  // Load from DB
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("fiscal_certificates")
        .select("*")
        .eq("tenant_id", tenantId);
      if (data && data.length > 0) {
        setCertificates(data.map((r: any) => ({ id: r.id, name: r.name, type: r.certificate_type, status: r.status, validoAte: r.valid_until, ...(r.metadata || {}) })));
        if (data[0]?.environment) setEnvironment(data[0].environment);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        // Fallback localStorage migration
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setCertificates(JSON.parse(raw));
        } catch {}
        const env = localStorage.getItem(ENV_KEY) as CertificateEnvironment;
        if (env) setEnvironment(env);
      }
    })();
  }, [tenantId]);

  // Persist to DB
  useEffect(() => {
    if (!tenantId || certificates.length === 0) return;
    const save = async () => {
      await (supabase as any).from("fiscal_certificates").delete().eq("tenant_id", tenantId);
      const rows = certificates.map((c: any) => ({
        id: c.id,
        tenant_id: tenantId,
        name: c.name || "Certificado",
        certificate_type: c.type || "A1",
        status: c.status || "pendente",
        valid_until: c.validoAte || null,
        environment,
        metadata: c,
        updated_at: new Date().toISOString(),
      }));
      await (supabase as any).from("fiscal_certificates").insert(rows);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ENV_KEY);
    };
    const t = setTimeout(save, 1000);
    return () => clearTimeout(t);
  }, [certificates, environment, tenantId]);

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
