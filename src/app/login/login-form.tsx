"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ failed }: { failed: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    failed ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    failed ? "Ссылка устарела или уже использована. Запросите новую." : "",
  );

  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage("Не удалось отправить письмо. Проверьте адрес и попробуйте ещё раз.");
    } else {
      setStatus("sent");
      setCooldown(60);
    }
    } catch {
      setStatus("error");
      setMessage("Не удалось связаться с сервером. Проверьте соединение и повторите попытку.");
    }
  }

  if (status === "sent") {
    return (
      <div className="card flex flex-col gap-2 p-5" role="status">
        <div className="text-lg font-bold">Проверьте почту</div>
        <p className="leading-relaxed text-muted">
          Мы отправили ссылку для входа на <b className="text-ink">{email}</b>. Откройте письмо на
          этом же телефоне.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-5">
          <button type="button" className="min-h-11 font-semibold text-accent underline" onClick={() => setStatus("idle")}>
            Указать другую почту
          </button>
          <button type="button" disabled={cooldown > 0} className="min-h-11 font-semibold text-accent underline disabled:no-underline disabled:opacity-60" onClick={() => void onSubmit()}>
            {cooldown > 0 ? `Отправить ещё раз через ${cooldown} с` : "Отправить ещё раз"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[15px] font-semibold">
          Электронная почта
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="aliya@mail.kz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input h-14 text-[17px]"
        />
      </div>
      {message && (
        <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
          {message}
        </p>
      )}
      <button type="submit" disabled={status === "sending"} className="btn-accent h-14 text-lg disabled:opacity-60">
        {status === "sending" ? "Отправляем…" : "Получить ссылку для входа"}
      </button>
    </form>
  );
}
