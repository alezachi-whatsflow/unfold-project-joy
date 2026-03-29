import { useEffect, useState } from "react";

export const ImpersonationBar = () => {
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  useEffect(() => {
    const checkImpersonation = () => {
      const tenantId = localStorage.getItem("whatsflow_default_tenant_id");
      const tenantName = localStorage.getItem("whatsflow_impersonated_name");
      if (tenantId && tenantName) {
        setImpersonatedName(tenantName);
      } else {
        setImpersonatedName(null);
      }
    };
    checkImpersonation();
    window.addEventListener("tenant-changed", checkImpersonation);
    return () => window.removeEventListener("tenant-changed", checkImpersonation);
  }, []);

  if (!impersonatedName) return null;

  const stopImpersonation = () => {
    localStorage.removeItem("whatsflow_default_tenant_id");
    localStorage.removeItem("whatsflow_impersonated_name");
    window.dispatchEvent(new Event("tenant-changed"));
    setImpersonatedName(null);
  };

  return (
    <div
      className="sticky top-0 z-[9999] flex items-center justify-between px-4 py-2 text-sm font-medium"
      style={{
        background: "var(--nexus-impersonate-bar)",
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-xs uppercase tracking-wider">
          Modo impersonation
        </span>
        <span className="font-semibold">{impersonatedName}</span>
      </div>
      <button
        onClick={stopImpersonation}
        className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
      >
        Sair
      </button>
    </div>
  );
};
