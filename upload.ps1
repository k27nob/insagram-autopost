# GitHubにアップロードし、トークンを登録して、確認用の実行を1回行います（投稿はしません）。
# 使い方: このファイルを右クリック →「PowerShellで実行」 または
#   powershell -ExecutionPolicy Bypass -File upload.ps1
$ErrorActionPreference = 'Stop'
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$repo = 'k27nob/insagram-autopost'
Set-Location $PSScriptRoot

$hasRemote = (git remote) -contains 'origin'
if (-not $hasRemote) {
    Write-Host '1/3 公開リポジトリを作成してアップロードします...'
    & $gh repo create $repo --public --source . --remote origin --push
} else {
    Write-Host '1/3 最新の内容をアップロードします...'
    git push -u origin main
}

Write-Host ''
Write-Host '2/3 アクセストークンを登録します。下に貼り付けて Enter を押してください（画面には表示されません）'
& $gh secret set IG_ACCESS_TOKEN -R $repo

Write-Host ''
Write-Host '3/3 確認用の実行を開始します（投稿はしません）'
& $gh workflow run instagram.yml -R $repo
Write-Host ''
Write-Host "完了しました。結果は https://github.com/$repo/actions で確認できます。Claudeに「できました」と伝えてください。"
Read-Host 'Enterで閉じます'
