import { cn } from '@/lib/utils';

export const fadeIn = "animate-in fade-in duration-normal";
export const fadeInFast = "animate-in fade-in duration-fast";
export const fadeInSlow = "animate-in fade-in duration-slow";
export const scaleIn = "animate-in zoom-in duration-normal";

export const hoverScale = "hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200";
export const hoverCard = cn(
  "transition-all duration-200",
  "hover:shadow-lg hover:shadow-foreground/5",
  "active:shadow-md active:scale-[0.98]"
);

export const buttonScale = "active:scale-95 transition-transform";