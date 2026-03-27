import { ReactNode } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceCapabilities, getCurrentDeviceType } from '@/hooks/useDeviceCapabilities';
import { MOBILE_RESTRICTED_FEATURES } from '@/config/mobile-features';
import { useNavigate } from 'react-router-dom';

interface Props {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function MobileRestricted({ featureKey, children, fallback }: Props) {
  const { isMobile, isTablet, isDesktop } = useDeviceCapabilities();
  const navigate = useNavigate();

  const config = MOBILE_RESTRICTED_FEATURES[featureKey];
  if (!config) return <>{children}</>;

  const device = getCurrentDeviceType();
  const isAvailable = config.available.includes(device);

  if (isAvailable) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border bg-muted/30 min-h-[200px] gap-4">
      <Monitor className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{config.message}</p>
      </div>
      {config.action && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (config.action?.href) navigate(config.action.href);
          }}
        >
          {config.action.label}
        </Button>
      )}
    </div>
  );
}
