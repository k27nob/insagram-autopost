# Instagram 自動投稿 セットアップ手順

学会チラシ30枚を、1週間かけて（毎日6:00〜24:00の間で約4.2時間おきに）Instagramへ自動投稿する仕組みです。
GitHub Actions が15分ごとに動き、予定時刻を過ぎた未投稿の画像を1枚ずつ投稿します。0:00〜6:00 は投稿しません。

## フォルダの中身

| ファイル | 役割 |
|---|---|
| `images/` | Instagram用に変換済みの画像（1080×1350、左右に白い余白） |
| `prepare-images.ps1` | 元のJPGから `images/` を作り直すスクリプト |
| `caption-template.txt` | 全投稿共通のキャプション |
| `make-schedule.mjs` | 開始日を指定して `schedule.json`（投稿予定表）を作る |
| `schedule.json` | 投稿予定表。1件ずつキャプションを変えたい場合はここを編集 |
| `post.mjs` | 投稿スクリプト（`LIVE=1` が無い限りドライラン） |
| `.github/workflows/instagram.yml` | GitHub Actions の定期実行設定 |

---

## ステップ1：Instagram をプロアカウントにする（スマホ・5分）

1. Instagramアプリ →「プロフィール」→ 右上の ≡ →「アカウントの種類とツール」
2. 「プロアカウントに切り替える」→ **ビジネス** か **クリエイター** を選ぶ（どちらでも可）

## ステップ2：Meta 開発者アプリを作る（15分）

Facebookページとの連携は不要な「Instagramログイン方式」を使います。

1. https://developers.facebook.com/ に（Facebookアカウントで）ログインし、開発者登録をする
   ※ 開発者登録にだけFacebookアカウントが必要です。Facebookページは作りません
2. 「マイアプリ」→「アプリを作成」→ ユースケースで **「Instagramでメッセージとコンテンツを管理」** を選ぶ → 作成
3. アプリの画面で「Instagram APIの設定（Instagramログインを使用）」を開く

## ステップ3：Instagramアカウントを追加してトークンを作る（10分）

1. 「アプリの役割」→「役割」→「メンバーを追加」→ **Instagramテスター** としてステップ1のInstagramアカウント名を追加
2. Instagram（ブラウザ）の「設定」→「ウェブサイトのアクセス許可」→「アプリとウェブサイト」→「テスターへの招待」で承認
3. アプリの「Instagram APIの設定」画面に戻り、「アクセストークンを生成」→ アカウントの「トークンを生成」→ Instagramでログインして許可
4. 表示された長いトークン（約60日有効）が **IG_ACCESS_TOKEN**。コピーして安全な場所に控える
   （IG_USER_ID は不要です。自動で「自分のアカウント」に投稿します）

> トークンはパスワードと同じです。人に見せたり、ファイルに書いてアップロードしないでください。

## ステップ4：GitHub にリポジトリを作ってアップロード（15分）

1. https://github.com/new で新しいリポジトリを作る（例：`insagram-autopost`）。
   **Public（公開）** にしてください。Instagram が画像を取りに来るため、画像が公開URLにある必要があります。
   （チラシ画像とキャプションが誰でも見られる状態になります。トークンは公開されません）
2. この `autopost` フォルダの中身をアップロード（Claudeに頼めば push まで手伝います）
3. リポジトリの「Settings」→「Secrets and variables」→「Actions」：
   - **Secrets** タブ → 「New repository secret」で `IG_ACCESS_TOKEN` を登録
   - **Variables** タブ → まだ何も作らない（＝ドライランのまま）

## ステップ5：開始日を決めてドライラン

1. 開始日を決めて予定表を作り直す（例：11月20日開始）
   ```
   node make-schedule.mjs 2026-11-20
   ```
2. GitHub に push した後、「Actions」タブ →「Instagram auto post」→「Run workflow」
3. ログに `【ドライラン】` と画像URLが出ればOK。その画像URLをブラウザで開いて画像が表示されることを確認

## ステップ6：本番開始

「Settings」→「Secrets and variables」→「Actions」→ **Variables** タブで `LIVE` = `1` を作成。
以降、予定時刻になると自動で投稿されます。止めたいときは `LIVE` を削除（または `0` に）するだけです。

---

## 補足

- 予定時刻からは最大15〜30分ほど遅れることがあります（GitHub Actions の仕様）。23時台の投稿が遅れて0時を過ぎた場合は、6時まで待ってから投稿します。
- 投稿済みの記録は `posted.json` に自動で保存されるので、二重投稿はしません。
- API の上限は24時間で50件なので、1日4〜5件のこの計画は問題ありません。
- 長期トークンの期限は60日です。1週間の計画なら更新は不要です。
