import { ThumbnailImage } from "@/components/thumbnail-image";
import { thumbUrl } from "@/lib/photos";

const TINTS = ["var(--thumb)", "var(--thumb-2)", "var(--thumb-3)", "var(--thumb-4)", "var(--thumb-5)", "var(--thumb-6)"];

/** Фото товара или цветная заглушка с первой буквой названия, если фото нет. */
export function ProductPhoto({
  url,
  alt,
  seed = 0,
  className = "",
  initial,
  priority = false,
  eager = false,
  thumbnail = false,
}: {
  url: string | null;
  alt: string;
  seed?: number;
  className?: string;
  /** Текст, из которого берётся буква для заглушки (по умолчанию alt). */
  initial?: string;
  priority?: boolean;
  eager?: boolean;
  thumbnail?: boolean;
}) {
  const letter = (initial ?? alt).trim().charAt(0).toUpperCase();
  const small = url && thumbnail ? thumbUrl(url) : url;
  const imageProps = {
    loading: priority || eager ? "eager" : "lazy",
    fetchPriority: priority ? "high" : eager ? "low" : undefined,
    decoding: priority || eager ? undefined : "async",
    className: "size-full object-cover",
  } as const;
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: TINTS[seed % TINTS.length] }}
      role={!url && alt ? "img" : undefined}
      aria-label={!url && alt ? alt : undefined}
    >
      {url && small && small !== url ? (
        <ThumbnailImage original={url} thumbnail={small} alt={alt} {...imageProps} />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} {...imageProps} />
      ) : letter && (
        <span aria-hidden="true" className="select-none text-[clamp(1.5rem,32%,3.5rem)] font-extrabold leading-none text-ink/70">
          {letter}
        </span>
      )}
    </div>
  );
}
