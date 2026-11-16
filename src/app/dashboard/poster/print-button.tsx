"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-accent h-12 w-full" onClick={() => window.print()}>
      Распечатать
    </button>
  );
}
