type BrandLogoProps = {
  className?: string;
  label?: string;
};

export default function BrandLogo({
  className = "",
  label = "TriAm",
}: BrandLogoProps) {
  return (
    <img
      src="/icon-192.png"
      alt={label}
      width={192}
      height={192}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
