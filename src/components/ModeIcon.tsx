import { Plane, Ship, Truck } from "lucide-react";
import { TransportMode } from "@/types/orchestra";

interface ModeIconProps {
  mode: TransportMode;
  className?: string;
  size?: number;
}

export function ModeIcon({ mode, className = '', size = 16 }: ModeIconProps) {
  const icons: Record<TransportMode, React.ReactNode> = {
    air: <Plane size={size} className={className} />,
    sea: <Ship size={size} className={className} />,
    land: <Truck size={size} className={className} />,
  };
  return <>{icons[mode]}</>;
}

export function getModeLabel(mode: TransportMode): string {
  return { air: 'AIR', sea: 'SEA', land: 'LAND' }[mode];
}
