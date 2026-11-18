import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiIcon, CameraIcon, WhatsAppIcon } from "@/components/icons";

const steps = [
  {
    title: "Сфотографируйте полку",
    Icon: CameraIcon,
    text: "Одно фото полки или витрины: ИИ найдёт товары и вырежет фото каждого. Есть прайс в Excel? Загрузите его файлом.",
  },
  {
    title: "Проверьте и опубликуйте",
    Icon: AiIcon,
    text: "ИИ предложит названия, описания на русском и казахском и категории. Вы правите, указываете цены и выбираете, что выложить.",
  },
  {
    title: "Получите заказ в WhatsApp или Telegram",
    Icon: WhatsAppIcon,
    text: "Покупатель собирает корзину по ссылке и пишет вам в WhatsApp, а при желании и в Telegram. Новые заказы можно получать в Telegram.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 pb-14 pt-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="text-2xl font-extrabold tracking-tight">
          S<span className="text-accent">Ö</span>RE
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <Link href="/login" className="font-semibold">
            Войти
          </Link>
          <Link href="/login" className="btn-dark hidden sm:inline-flex">
            Создать магазин
          </Link>
        </div>
      </header>

      <section id="main-content" tabIndex={-1} className="flex flex-wrap items-center gap-14">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <span className="self-start rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent-dark">
            Для продавцов из Instagram и WhatsApp
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Ваша полка в интернете — прямо с телефона
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Сфотографируйте полку — ИИ найдёт товары и составит карточки на русском и казахском. Или загрузите прайс из Excel.
            Поделитесь ссылкой на витрину: покупатели соберут корзину и напишут вам в WhatsApp или Telegram.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-accent min-h-14 text-lg">
              Создать магазин
            </Link>
            <Link href="/demo" className="btn-outline min-h-14 text-lg">
              Посмотреть демо
            </Link>
          </div>
          <p className="text-body text-muted">Бесплатно до 15 товаров · без сайта и программиста</p>
        </div>

        <div className="mx-auto grid w-full max-w-md grid-cols-2 items-start gap-3" aria-label="Пример работы SÖRE">
          <figure className="card overflow-hidden p-2">
            <div className="rounded-xl bg-thumb p-2">
              <div className="grid grid-cols-2 gap-2 border-b-4 border-field pb-2">
                {["kese", "slippers", "dombyra", "takiya"].map((image, index) => (
                  <div key={image} className="relative overflow-hidden rounded-lg border-2 border-accent">
                    <Image src={`/landing/${image}.jpg`} alt="" width={600} height={600} sizes="(min-width: 640px) 110px, 22vw" className="aspect-square w-full object-cover" />
                    <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="px-1 pt-2 text-sm font-semibold">Пример полки с найденными товарами</figcaption>
          </figure>
          <Link href="/demo" className="card flex flex-col gap-3 p-3 transition-colors hover:border-ink" aria-label="Открыть демо-витрину «Ою сувенир»">
            <div className="text-sm font-bold">Витрина магазина</div>
            {[["slippers", "Войлочные тапочки", "8 500 ₸"], ["kese", "Кесе с росписью", "12 000 ₸"]].map(([image, title, price]) => (
              <div key={image} className="flex flex-col gap-1">
                <Image src={`/landing/${image}.jpg`} alt="" width={600} height={600} sizes="(min-width: 640px) 220px, 45vw" className="aspect-[4/3] w-full rounded-xl object-cover" />
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-sm font-bold">{price}</div>
              </div>
            ))}
          </Link>
        </div>
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="problem">
        <h2 id="problem" className="text-3xl font-extrabold">Меньше одинаковых вопросов в переписке</h2>
        <p className="mt-4 max-w-3xl text-lg text-muted">Фото теряются в чате, цены приходится отправлять каждому. Соберите товары в одной витрине: покупатель увидит наличие, выберет товары и отправит состав заказа.</p>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Три шага до первого заказа</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card icon-host flex flex-col gap-2.5 p-6" style={{ "--rise-index": i } as CSSProperties}>
              <div className="icon-badge">
                <s.Icon size={24} />
              </div>
              <div className="text-xl font-bold">{s.title}</div>
              <p className="leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="features" className="flex flex-col gap-6">
        <h2 id="features" className="text-3xl font-extrabold">Всё для вашей витрины</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[["Фото полки", "Карточки нескольких товаров по одному снимку. Проверьте результат ИИ перед публикацией."], ["Прайс Excel и CSV", "Добавляйте товары из таблицы и проверяйте ошибки в отчёте."], ["Русский и казахский", "Покупатель выбирает язык витрины. Описания можно исправить вручную."], ["WhatsApp и Telegram", "Состав заказа и связь с продавцом в привычном мессенджере."], ["Светлая и тёмная тема", "Покупатель выбирает комфортное оформление."], ["Ссылка и QR-код", "Отправьте витрину в чат или распечатайте плакат."]].map(([title, text]) => <div key={title} className="card p-5"><h3 className="font-bold">{title}</h3><p className="mt-2 text-muted">{text}</p></div>)}
        </div>
      </section>
      <section className="flex flex-col gap-6" aria-labelledby="plans">
        <h2 id="plans" className="text-3xl font-extrabold tracking-tight">
          Начните бесплатно
        </h2>
        <div className="grid gap-5">
          <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xl font-bold">Free</div>
              <div className="text-3xl font-extrabold">0 ₸</div>
            </div>
            <ul className="flex flex-col gap-2 text-muted">
              <li>До 15 товаров</li>
              <li>Ограниченное число ИИ-генераций в день</li>
              <li>Плашка «Сделано в SÖRE»</li>
            </ul>
            <Link href="/login" className="btn-accent mt-auto">
              Создать магазин
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="mb-6 text-3xl font-extrabold">Частые вопросы</h2>
        {[["Нужен ли свой сайт?", "Нет. Вы получите ссылку на витрину, которую можно отправить клиентам или добавить в профиль."], ["Можно ли начать без ИИ?", "Да. Добавляйте карточки вручную или загружайте прайс из Excel и CSV."], ["Нужно ли проверять распознанные товары?", "Да. ИИ может ошибиться в названии, описании или цене. Перед публикацией проверьте каждую карточку."], ["Как покупатель оплатит заказ?", "Оплаты на сайте нет. Способ оплаты и доставку вы согласуете с покупателем напрямую."], ["Сколько товаров доступно бесплатно?", "До 15 товаров. Число ИИ-генераций в день ограничено; остаток виден при работе с ИИ."]].map(([question, answer]) => <details key={question} className="border-b border-line py-2"><summary className="cursor-pointer py-3 font-bold">{question}</summary><p className="pb-4 text-muted">{answer}</p></details>)}
      </section>
      <section className="card flex flex-col items-start gap-4 p-6 sm:p-8">
        <h2 className="text-3xl font-extrabold">Начните с первого товара</h2>
        <p className="text-muted">Создайте магазин, добавьте товары и поделитесь ссылкой с покупателями.</p>
        <Link href="/login" className="btn-accent">Создать магазин</Link>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
        <div>© SÖRE · Сделано в Казахстане</div>
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
