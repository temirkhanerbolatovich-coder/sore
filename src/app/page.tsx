import Link from "next/link";

const steps = [
  {
    title: "Сфотографируйте",
    text: "Снимите товар на телефон и укажите цену. Больше ничего вводить не нужно.",
  },
  {
    title: "ИИ напишет карточку",
    text: "Название, описание на русском и казахском, категория. Вы только правите.",
  },
  {
    title: "Получите заказ в WhatsApp",
    text: "Клиент собирает корзину по вашей ссылке, а вы получаете готовый текст заказа с суммой и адресом.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 pb-14 pt-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="text-2xl font-extrabold tracking-tight">
          duken<span className="text-accent">.ai</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className="font-semibold">
            Войти
          </Link>
          <Link href="/login" className="btn-dark hidden sm:inline-flex">
            Создать магазин
          </Link>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-14">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <span className="self-start rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent-dark">
            Для продавцов из Instagram и WhatsApp
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Магазин за 2 минуты — прямо с телефона
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Сфотографируйте товар — ИИ напишет карточку на русском и казахском. Ссылку поставьте
            в био, а заказы придут вам в WhatsApp уже собранными.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-accent min-h-14 text-lg">
              Создать магазин
            </Link>
            <Link href="/demo" className="btn-outline min-h-14 text-lg">
              Посмотреть демо
            </Link>
          </div>
          <p className="text-[15px] text-muted">Бесплатно до 15 товаров · без сайта и программиста</p>
        </div>

        <div
          className="mx-auto flex w-[300px] flex-none flex-col gap-3 rounded-[40px] border-8 border-ink bg-white p-4"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-full bg-[#f3d9c4]" />
            <div>
              <div className="text-[15px] font-bold">Сладкий дом Алии</div>
              <div className="text-xs text-muted">Алматы · duken.ai/aliya</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["Торт «Прага»", "12 000 ₸", "#f3d9c4"],
              ["Капкейки, 6 шт", "4 500 ₸", "#e8d5e6"],
            ].map(([t, p, c]) => (
              <div key={t} className="flex flex-col gap-1.5">
                <div className="h-24 rounded-xl" style={{ background: c }} />
                <div className="text-[13px] font-semibold">{t}</div>
                <div className="text-[13px] text-muted">{p}</div>
              </div>
            ))}
          </div>
          <div className="flex min-h-11 items-center justify-center rounded-xl bg-wa text-sm font-bold text-white">
            Заказать в WhatsApp · 21 000 ₸
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Три шага до первого заказа</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card flex flex-col gap-2.5 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft font-extrabold text-accent-dark">
                {i + 1}
              </div>
              <div className="text-xl font-bold">{s.title}</div>
              <p className="leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="plans">
        <h2 id="plans" className="text-3xl font-extrabold tracking-tight">
          Начните бесплатно
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card flex flex-col gap-4 p-6">
            <div>
              <div className="text-xl font-bold">Free</div>
              <div className="text-3xl font-extrabold">0 ₸</div>
            </div>
            <ul className="flex flex-col gap-2 text-muted">
              <li>До 15 товаров</li>
              <li>20 ИИ-генераций в день</li>
              <li>Плашка «Сделано в DukenAI»</li>
            </ul>
            <Link href="/login" className="btn-accent mt-auto">
              Создать магазин
            </Link>
          </div>
          <div className="card flex flex-col gap-4 border-2 border-ink p-6">
            <div>
              <div className="text-xl font-bold">Pro · скоро</div>
              <div className="text-3xl font-extrabold">~2 500 ₸/мес</div>
            </div>
            <ul className="flex flex-col gap-2 text-muted">
              <li>До 500 товаров</li>
              <li>Свой логотип и цвета, без плашки</li>
              <li>Аналитика заказов и безлимит ИИ</li>
            </ul>
            <span className="btn-outline mt-auto cursor-default opacity-60" aria-disabled="true">
              Появится после запуска
            </span>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
        <div>© DukenAI · Сделано в Казахстане</div>
        <nav aria-label="Юридическая информация" className="flex flex-wrap gap-x-5">
          <Link href="/terms" className="flex min-h-11 items-center underline">
            Условия
          </Link>
          <Link href="/privacy" className="flex min-h-11 items-center underline">
            Конфиденциальность
          </Link>
        </nav>
      </footer>
    </main>
  );
}
