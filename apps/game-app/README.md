# Game App

[nanobase API](https://nanobase.cc)を使ったゲームアプリのサンプルです。

認証・データ保存・ログ機能をnanobase APIに任せることで、シンプルなコードでランキング機能付きゲームを実現しています。

## 機能

- ユーザー登録・ログイン
- 10秒クリッカーゲーム
- グローバルランキング（TOP 10）
- 自己ベスト記録
- プレイイベントの自動ログ

## セットアップ

### 1. nanobase APIを起動

```bash
# nanobase リポジトリで
docker-compose up -d
```

### 2. このアプリを起動

```bash
pnpm install
pnpm dev
```

http://localhost:3208 でアクセスできます。

## 環境変数

`.env`ファイルを作成してAPI URLを設定できます（オプション）。

```bash
VITE_EASYAUTH_URL=http://localhost:3201
VITE_POCKETDATA_URL=http://localhost:3202
VITE_MONITOR_URL=http://localhost:3204
VITE_PROJECT_ID=game-app
```

## 使用しているnanobase API

| API | 用途 |
|-----|------|
| EasyAuth | プレイヤー認証 |
| PocketData | スコア・ランキングの保存 |
| Monitor | プレイイベントログ |

## ライセンス

MIT
