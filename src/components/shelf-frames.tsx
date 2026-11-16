import type { BBox } from "@/lib/bbox";

export type ShelfFrame = { bbox: BBox; label?: string; active?: boolean };

/**
 * Снимок полки с рамками товаров. Рамки в процентах от размеров картинки, поэтому совпадают с ней
 * при любой ширине экрана и не требуют знать размеры снимка заранее.
 */
export function ShelfFrames({
  src,
  alt,
  frames,
  lazy = false,
  className = "",
}: {
  src: string;
  alt: string;
  frames: ShelfFrame[];
  lazy?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-thumb ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} decoding="async" className="block h-auto w-full" />
      {frames.map((f, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`absolute rounded-md border-2 transition-colors ${f.active === false ? "border-cream/70" : "border-accent shadow-[0_0_0_2px_var(--cream)]"}`}
          style={{
            left: `${f.bbox.x1 * 100}%`,
            top: `${f.bbox.y1 * 100}%`,
            width: `${(f.bbox.x2 - f.bbox.x1) * 100}%`,
            height: `${(f.bbox.y2 - f.bbox.y1) * 100}%`,
          }}
        >
          {f.label && (
            <span
              className={`absolute left-1 top-1 min-w-6 rounded-full px-1.5 text-center text-xs font-extrabold leading-6 ${f.active === false ? "bg-cream/80 text-muted" : "bg-accent text-on-accent"}`}
            >
              {f.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
