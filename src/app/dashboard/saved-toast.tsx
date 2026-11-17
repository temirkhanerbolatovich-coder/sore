"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";

/** Подтверждение действия после редиректа (?saved=…). Закрывается само; при закрытии параметр убирается из адреса. */
export function SavedToast({ message }: { message: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Toast
      message={message}
      onClose={() => {
        setOpen(false);
        router.replace("/dashboard", { scroll: false });
      }}
    />
  );
}
