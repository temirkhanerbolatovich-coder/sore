"use client";

import { useActionState, useState } from "react";
import { createShop, type OnboardingState } from "./actions";
import { slugify } from "@/lib/slug";

const initial: OnboardingState = {};

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createShop, initial);
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  const shownSlug = slugTouched ? slug : slugify(name);
  const errIn = (f: string) => state.field === f;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold">
          Название магазина
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          placeholder="Сладкий дом Алии"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errIn("name")}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-sm font-semibold">
          Адрес ссылки
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-muted">duken.ai/</span>
          <input
            id="slug"
            name="slug"
            required
            placeholder="aliya-sweets"
            value={shownSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            aria-invalid={errIn("slug")}
            className="input"
          />
        </div>
        <p className="text-[13px] text-muted">Латиница, цифры и дефис. Эту ссылку вы поставите в био Instagram.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="whatsapp" className="text-sm font-semibold">
          Номер WhatsApp
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          required
          inputMode="tel"
          placeholder="+7 701 123 45 67"
          defaultValue={state.values?.whatsapp}
          aria-invalid={errIn("whatsapp")}
          className="input"
        />
        <p className="text-[13px] text-muted">Сюда будут приходить заказы.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="city" className="text-sm font-semibold">
          Город
        </label>
        <input id="city" name="city" placeholder="Алматы" defaultValue={state.values?.city} className="input" />
      </div>

      {state.error && (
        <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent h-14 text-lg disabled:opacity-60">
        {pending ? "Создаём…" : "Создать магазин"}
      </button>
    </form>
  );
}
