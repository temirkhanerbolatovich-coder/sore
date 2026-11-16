/**
 * Файлы логотипа SÖRE (направление 05 «Связь») из src/lib/brand.ts:
 *
 *   npm run brand:export
 *
 * public/brand/: знак и логотип для светлой и тёмной темы (SVG) и аватар бота 640×640 (PNG) для @BotFather → /setuserpic.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { avatarSvg, logoSvg, markSvg } from "@/lib/brand";

async function main() {
  const dir = "public/brand";
  await mkdir(dir, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await writeFile(`${dir}/sore-mark-${theme}.svg`, markSvg(theme));
    await writeFile(`${dir}/sore-logo-${theme}.svg`, logoSvg(theme));
  }
  await writeFile(`${dir}/sore-bot-avatar.png`, await sharp(Buffer.from(avatarSvg("dark", 640))).png().toBuffer());
  await writeFile(`${dir}/sore-logo-preview.png`, await sharp(Buffer.from(logoSvg("light")), { density: 288 }).flatten({ background: "#F6F7F3" }).png().toBuffer());
  console.log(`Готово: ${dir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
