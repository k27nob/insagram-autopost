// schedule.json のうち「予定時刻を過ぎていて未投稿」のものを1件だけ Instagram に投稿します。
// GitHub Actions から15分ごとに実行される想定。投稿済みは posted.json に記録します。
//
// 環境変数:
//   IG_USER_ID       InstagramのユーザーID(省略時は me)
//   IG_ACCESS_TOKEN  長期アクセストークン
//   IMAGE_BASE_URL   images/ を公開しているURL (例: https://<user>.github.io/<repo>/images)
//   LIVE=1           これが無い限りドライラン(実際には投稿しない)
// オプション: --now 2026-11-20T10:00:00+09:00  (現在時刻を上書きしてテスト)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN || '').trim();
// IGAA… = Instagramログインのトークン → graph.instagram.com / EAA… = Facebookログインのトークン → graph.facebook.com
const API = IG_ACCESS_TOKEN.startsWith('EAA') ? 'https://graph.facebook.com/v21.0' : 'https://graph.instagram.com/v21.0';
const LIVE = process.env.LIVE === '1';

// --check: トークンが使えるか確認し、アカウント名を表示するだけ(投稿しない)
if (process.argv.includes('--check')) {
  if (!IG_ACCESS_TOKEN) throw new Error('IG_ACCESS_TOKEN が設定されていません');
  console.log(`トークンの種類: ${IG_ACCESS_TOKEN.slice(0, 4)}… / 接続先: ${API}`);
  const fields = API.includes('instagram') ? 'user_id,username' : 'id,name';
  const me = await call('me', { fields }, 'GET');
  console.log('OK:', JSON.stringify(me));
  if (!API.includes('instagram')) {
    const acc = await call('me/accounts', { fields: 'name,instagram_business_account{id,username}' }, 'GET').catch(e => ({ error: e.message }));
    console.log('Instagramアカウント:', JSON.stringify(acc));
  }
  process.exit(0);
}
const nowArg = process.argv.indexOf('--now');
const now = nowArg > 0 ? Date.parse(process.argv[nowArg + 1]) : Date.now();

const schedule = JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8'));
const postedPath = path.join(dir, 'posted.json');
const posted = fs.existsSync(postedPath) ? JSON.parse(fs.readFileSync(postedPath, 'utf8')) : {};

const jstHour = new Date(now + 9 * 3600e3).getUTCHours();
if (jstHour < 6) { console.log(`JST ${jstHour}時: 0〜6時は投稿しません`); process.exit(0); }

const due = schedule.find(p => !posted[p.file] && Date.parse(p.at) <= now);
if (!due) { console.log('投稿予定のものはありません'); process.exit(0); }

const base = (process.env.IMAGE_BASE_URL || 'https://example.invalid/images').replace(/\/$/, '');
const imageUrl = `${base}/${encodeURIComponent(due.file)}`;
console.log(`${LIVE ? '【本番】' : '【ドライラン】'} #${due.id} ${due.file} (予定 ${due.at})`);
console.log(`  画像URL: ${imageUrl}`);
console.log(`  キャプション: ${due.caption.split('\n')[0]}…`);

if (!LIVE) process.exit(0);

const IG_USER_ID = process.env.IG_USER_ID || 'me';
if (!IG_ACCESS_TOKEN || !process.env.IMAGE_BASE_URL) {
  throw new Error('IG_ACCESS_TOKEN / IMAGE_BASE_URL が設定されていません');
}

async function call(endpoint, params, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const url = method === 'GET' ? `${API}/${endpoint}?${body}` : `${API}/${endpoint}`;
  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${endpoint}: ${JSON.stringify(json.error || json)}`);
  return json;
}

// 1) メディアコンテナ作成 → 2) 処理完了を待つ → 3) 公開
const { id: creationId } = await call(`${IG_USER_ID}/media`, { image_url: imageUrl, caption: due.caption });
for (let i = 0; i < 20; i++) {
  const { status_code } = await call(creationId, { fields: 'status_code' }, 'GET');
  if (status_code === 'FINISHED') break;
  if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`コンテナ状態: ${status_code}`);
  await new Promise(r => setTimeout(r, 3000));
}
const { id: mediaId } = await call(`${IG_USER_ID}/media_publish`, { creation_id: creationId });

posted[due.file] = { mediaId, postedAt: new Date().toISOString() };
fs.writeFileSync(postedPath, JSON.stringify(posted, null, 2) + '\n');
console.log(`  投稿しました: media id ${mediaId}`);
