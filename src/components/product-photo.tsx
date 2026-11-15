const TINTS = ["#f3d9c4", "#e8d5e6", "#d9e6d0", "#f6e3a8", "#d6e4f0", "#f0d2c0"];

/** Фото товара или цветная заглушка, если фото нет. */
export function ProductPhoto({
  url,
  alt,
  seed = 0,
  className = "",
}: {
  url: string | null;
  alt: string;
  seed?: number;
  className?: string;
}) {
  if (!url) {
    return <div className={className} style={{ background: TINTS[seed % TINTS.length] }} role="img" aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
