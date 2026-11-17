// まだ投稿していない分のキャプションを、talks.json と summaries.json(講演内容・講師紹介)から作り直します。
// 投稿時刻と投稿済みの分は変えません。 使い方: node update-captions.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const schedule = read('schedule.json');
const talks = read('talks.json');
const summaries = read('summaries.json');
const posted = fs.existsSync(path.join(dir, 'posted.json')) ? read('posted.json') : {};
const footer = fs.readFileSync(path.join(dir, 'caption-template.txt'), 'utf8').trim();

export function caption(file) {
  const t = talks[file], s = summaries[file];
  if (!t) return footer;
  return [
    `【講演紹介】${t.title}`,
    '',
    ...(s ? [s.about, ''] : []),
    `🎤 ${t.speaker}`,
    t.org,
    ...(s ? [s.bio] : []),
    '',
    `📅 2026年${t.when}`,
    `📍 パシフィコ横浜会議センター ${t.room}`,
    ...(t.handson ? ['※有料ハンズオン（事前申込制）'] : []),
    '',
    footer,
  ].join('\n');
}

let n = 0;
for (const p of schedule) {
  if (posted[p.file]) continue;
  p.caption = caption(p.file);
  if (p.caption.length > 2200) throw new Error(`${p.file}: キャプションが2200文字を超えています`);
  n++;
}
fs.writeFileSync(path.join(dir, 'schedule.json'), JSON.stringify(schedule, null, 2) + '\n');
const lens = schedule.filter(p => !posted[p.file]).map(p => p.caption.length);
console.log(`${n}件のキャプションを更新しました(文字数 ${Math.min(...lens)}〜${Math.max(...lens)})`);
