"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/order";
import { slugError } from "@/lib/slug";

export type OnboardingState = {
  error?: string;
  field?: "name" | "slug" | "whatsapp";
  values?: { name: string; slug: string; whatsapp: string; city: string };
};

const schema = z.object({
  name: z.string().trim().min(2, "Название: минимум 2 символа").max(60, "Название слишком длинное"),
  slug: z.string().trim().toLowerCase(),
  whatsapp: z.string(),
  city: z.string().trim().max(60).optional(),
});

export async function createShop(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    city: String(formData.get("city") ?? ""),
  };
  const values = { ...raw };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, field: "name", values };
  }
  const { name, slug, city } = parsed.data;

  const sErr = slugError(slug);
  if (sErr) return { error: sErr, field: "slug", values };

  const whatsapp = normalizePhone(parsed.data.whatsapp);
  if (!/^[0-9]{10,15}$/.test(whatsapp)) {
    return {
      error: "Номер WhatsApp в формате +7 701 123 45 67",
      field: "whatsapp",
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("shops").insert({
    owner_id: user.id,
    name,
    slug,
    whatsapp,
    city: city || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Этот адрес уже занят, выберите другой", field: "slug", values };
    }
    return { error: "Не удалось создать магазин. Попробуйте ещё раз.", values };
  }

  redirect("/dashboard");
}
