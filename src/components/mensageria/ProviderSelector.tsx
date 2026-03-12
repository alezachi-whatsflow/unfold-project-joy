import { cn } from "@/lib/utils";
import { Server, Zap, Puzzle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type Provider = "uazapi" | "zapi" | "meta_oficial" | "custom";

interface ProviderOption {
  id: Provider;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "active" | "coming_soon" | "beta";
}

const providers: ProviderOption[] = [
  {
    id: "uazapi",
    label: "uazapi",
    description: "Instâncias gerenciadas via API REST",
    icon: <Server className="h-5 w-5" />,
    status: "active",
  },
  {
    id: "zapi",
    label: "Z-API",
    description: "Conexões via Z-API / token",
    icon: <Zap className="h-5 w-5" />,
    status: "active",
  },
  {
    id: "meta_oficial",
    label: "API Oficial Meta",
    description: "WhatsApp Business Platform (Cloud API)",
    icon: <ShieldCheck className="h-5 w-5" />,
    status: "beta",
  },
  {
    id: "custom",
    label: "Outro Provedor",
    description: "Evolution API ou provedor customizado",
    icon: <Puzzle className="h-5 w-5" />,
    status: "coming_soon",
  },
];

interface ProviderSelectorProps {
  selected: Provider;
  onChange: (provider: Provider) => void;
}

export default function ProviderSelector({ selected, onChange }: ProviderSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {providers.map((p) => {
        const isSelected = selected === p.id;
        const isDisabled = p.status === "coming_soon";

        return (
          <button
            key={p.id}
            onClick={() => !isDisabled && onChange(p.id)}
            disabled={isDisabled}
            className={cn(
              "relative flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50",
              isDisabled && "opacity-50 cursor-not-allowed hover:bg-card hover:border-border"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{p.label}</span>
                {p.status === "coming_soon" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Em breve</Badge>
                )}
                {p.status === "beta" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500 text-yellow-500">Beta</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
