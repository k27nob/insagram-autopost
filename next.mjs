// 次の未投稿の予定時刻までの秒数を出力します(0〜6時JSTにかかる場合は6時まで待つ)。全部投稿済みなら -1。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const schedule = JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8'));
const postedPath = path.join(dir, 'posted.json');
const posted = fs.existsSync(postedPath) ? JSON.parse(fs.readFileSync(postedPath, 'utf8')) : {};

const next = schedule.find(p => !posted[p.file]);
if (!next) { console.log(-1); process.exit(0); }

const JST = 9 * 3600e3;
let t = Math.max(Date.parse(next.at), Date.now());
const h = new Date(t + JST).getUTCHours();
if (h < 6) { const d = new Date(t + JST); d.setUTCHours(6, 0, 0, 0); t = d.getTime() - JST; }
console.log(Math.max(0, Math.ceil((t - Date.now()) / 1000)));
