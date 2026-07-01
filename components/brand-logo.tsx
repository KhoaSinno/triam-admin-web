type BrandLogoProps = {
  className?: string;
  label?: string;
};

export default function BrandLogo({
  className = "",
  label = "TriAm",
}: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`triam-brand-mark inline-block shrink-0 ${className}`}
    />
  );
}
