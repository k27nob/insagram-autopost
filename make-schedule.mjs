// images/ の画像を「開始日から7日間・毎日6:00〜24:00(JST)」に等間隔で割り振り、schedule.json を作ります。
// 使い方: node make-schedule.mjs 2026-11-20   (開始日。省略すると明日)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DAYS = 7, START_H = 6, END_H = 24;         // 投稿可能時間帯 6:00〜24:00 JST
const JST = 9 * 3600e3;

const images = fs.readdirSync(path.join(dir, 'images')).filter(f => /\.jpe?g$/i.test(f)).sort();
const caption = fs.readFileSync(path.join(dir, 'caption-template.txt'), 'utf8').trim();

let startDay = process.argv[2];
if (!startDay) {
  const t = new Date(Date.now() + JST + 86400e3);
  startDay = t.toISOString().slice(0, 10);
}
const dayStartUtc = d => Date.parse(`${startDay}T00:00:00+09:00`) + d * 86400e3;

const activeMin = DAYS * (END_H - START_H) * 60;
const step = activeMin / images.length;
const perDay = (END_H - START_H) * 60;

const posts = images.map((file, i) => {
  let m = Math.round((step * (i + 0.5)) / 5) * 5;  // 区間の中央に置き、5分単位に丸める
  const day = Math.floor(m / perDay), inDay = m % perDay;
  const at = new Date(dayStartUtc(day) + (START_H * 60 + inDay) * 60e3);
  return { id: i + 1, file, at: at.toISOString(), caption };
});

fs.writeFileSync(path.join(dir, 'schedule.json'), JSON.stringify(posts, null, 2) + '\n');
const fmt = iso => new Date(Date.parse(iso) + JST).toISOString().slice(0, 16).replace('T', ' ');
for (const p of posts) console.log(String(p.id).padStart(2), fmt(p.at), 'JST', p.file);
console.log(`\n${posts.length}件 / 間隔 約${(step / 60).toFixed(1)}時間(0〜6時を除く)`);
