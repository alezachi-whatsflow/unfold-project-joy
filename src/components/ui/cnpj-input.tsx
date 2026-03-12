import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { validateCNPJ, maskCNPJAlpha, unmaskCNPJ } from "@/lib/cnpjValidation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface CnpjInputProps {
  value: string; // raw unmasked value
  onChange: (raw: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showTooltip?: boolean;
}

const CnpjInput = React.forwardRef<HTMLInputElement, CnpjInputProps>(
  ({ value, onChange, placeholder = "XX.XXX.XXX/XXXX-XX", disabled, className, showTooltip = true }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => maskCNPJAlpha(value || ""));
    const [touched, setTouched] = useState(false);

    useEffect(() => {
      setDisplayValue(maskCNPJAlpha(value || ""));
    }, [value]);

    const raw = unmaskCNPJ(displayValue);
    const isComplete = raw.length === 14;
    const isValid = isComplete && validateCNPJ(raw);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskCNPJAlpha(e.target.value);
        setDisplayValue(masked);
        onChange(unmaskCNPJ(masked));
      },
      [onChange]
    );

    const borderClass = touched && isComplete
      ? isValid
        ? "border-green-500 focus-visible:ring-green-500/30"
        : "border-red-500 focus-visible:ring-red-500/30"
      : "";

    return (
      <div className="relative flex items-center gap-1.5">
        <input
          ref={ref}
          type="text"
          inputMode="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
            borderClass,
            className
          )}
        />
        {showTooltip && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 shrink-0 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs">
                A partir de jul/2026, o CNPJ passará a aceitar letras (A-Z) nas 12 primeiras posições. Este campo já está preparado para o novo formato alfanumérico.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
);
CnpjInput.displayName = "CnpjInput";

export { CnpjInput };
