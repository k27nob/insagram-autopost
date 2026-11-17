// images/ の画像を「開始時刻から指定日数の間・毎日6:00〜24:00(JST)」に等間隔で割り振り、schedule.json を作ります。
// キャプションは talks.json(演題・講演者など)から1件ずつ作ります。
// 使い方: node make-schedule.mjs 2026-11-17T13:35 3   (開始日時JST, 日数)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const START_H = 6;                      // 0:00〜6:00 は投稿しない
const JST = 9 * 3600e3, MIN = 60e3;

const images = fs.readdirSync(path.join(dir, 'images')).filter(f => /\.jpe?g$/i.test(f)).sort();
const talks = JSON.parse(fs.readFileSync(path.join(dir, 'talks.json'), 'utf8'));
const footer = fs.readFileSync(path.join(dir, 'caption-template.txt'), 'utf8').trim();

const [startArg, daysArg = '3'] = process.argv.slice(2);
if (!startArg) throw new Error('開始日時を指定してください 例: node make-schedule.mjs 2026-11-17T13:35 3');
const start = Date.parse(`${startArg}:00+09:00`);
const end = start + Number(daysArg) * 24 * 60 * MIN;
const ok = t => new Date(t + JST).getUTCHours() >= START_H;

// 投稿可能な分のリストを作り、それを件数で等分する
const slots = [];
for (let t = start; t < end; t += MIN) if (ok(t)) slots.push(t);
const step = slots.length / images.length;

function caption(file) {
  const t = talks[file];
  if (!t) return footer;
  return [
    `【講演紹介】${t.title}`,
    '',
    `🎤 ${t.speaker}`,
    `　${t.org}`,
    `📅 2026年${t.when}`,
    `📍 パシフィコ横浜会議センター ${t.room}`,
    ...(t.handson ? ['※有料ハンズオン（事前申込制）'] : []),
    '',
    footer,
  ].join('\n');
}

const posts = images.map((file, i) => ({
  id: i + 1, file, at: new Date(slots[Math.floor(i * step)]).toISOString(), caption: caption(file),
}));

fs.writeFileSync(path.join(dir, 'schedule.json'), JSON.stringify(posts, null, 2) + '\n');
const fmt = ms => new Date(ms + JST).toISOString().slice(5, 16).replace('T', ' ');
for (const p of posts) console.log(String(p.id).padStart(2), fmt(Date.parse(p.at)), p.file, talks[p.file]?.speaker ?? '');
console.log(`\n${posts.length}件 / 間隔 約${(step / 60).toFixed(1)}時間(0〜6時を除く)`);
