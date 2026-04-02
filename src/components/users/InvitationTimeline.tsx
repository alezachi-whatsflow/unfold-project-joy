import { fmtDate } from "@/lib/dateUtils";
import { CheckCircle2, Clock, Mail, UserCheck, Circle } from "lucide-react";

type InvitationStatus = "pending" | "invited" | "accepted" | "active";

interface InvitationTimelineProps {
  status: InvitationStatus;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  createdAt?: string | null;
}

const STEPS = [
  { key: "invited", label: "Convite Enviado", icon: Mail, description: "E-mail de convite enviado" },
  { key: "accepted", label: "Link Acessado", icon: UserCheck, description: "Usuário acessou o link" },
  { key: "active", label: "Conta Ativa", icon: CheckCircle2, description: "Senha criada e acesso ativado" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  invited: 1,
  accepted: 2,
  active: 3,
};

function formatDate(d?: string | null) {
  if (!d) return null;
  return fmtDate(d);
}

export function InvitationTimeline({ status, invitedAt, acceptedAt, createdAt }: InvitationTimelineProps) {
  const currentStep = STATUS_ORDER[status] ?? 0;

  const dates: Record<string, string | null> = {
    invited: formatDate(invitedAt),
    accepted: formatDate(acceptedAt),
    active: formatDate(acceptedAt || createdAt),
  };

  return (
    <div className="flex items-center gap-1 w-full py-2">
      {STEPS.map((step, idx) => {
        const stepOrder = STATUS_ORDER[step.key];
        const isComplete = currentStep >= stepOrder;
        const isCurrent = currentStep === stepOrder;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center text-center gap-1 min-w-[80px]">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  isComplete
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground/40"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isComplete ? "text-foreground" : "text-muted-foreground/60"}`}>
                {step.label}
              </span>
              {dates[step.key] && isComplete && (
                <span className="text-[9px] text-muted-foreground">{dates[step.key]}</span>
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded ${currentStep > stepOrder ? "bg-primary" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
