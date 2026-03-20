import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

function BrandMark({
  maskSrc,
  label,
  aspectRatio,
  className,
}: {
  maskSrc: string;
  label: string;
  aspectRatio: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-block shrink-0 select-none bg-current text-primary",
        className,
      )}
      style={{
        aspectRatio,
        WebkitMaskImage: `url(${maskSrc})`,
        maskImage: `url(${maskSrc})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function LogoIcon({ className }: LogoProps) {
  return (
    <BrandMark
      maskSrc="/assets/logos/logo.svg"
      label="Zublo logo"
      aspectRatio="816 / 829"
      className={className}
    />
  );
}

export function LogoWithName({ className }: LogoProps) {
  return (
    <BrandMark
      maskSrc="/assets/logos/logo-name-vertical.svg"
      label="Zublo"
      aspectRatio="3224 / 829"
      className={className}
    />
  );
}
