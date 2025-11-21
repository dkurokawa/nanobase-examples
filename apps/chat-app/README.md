# Chat App

[nanobase API](https://nanobase.cc)を使ったチャットアプリのサンプルです。

認証・データ保存・ログ機能をnanobase APIに任せることで、シンプルなコードでリアルタイムチャットを実現しています。

## 機能

- ユーザー登録・ログイン
- パブリックチャットルーム
- メッセージの送受信
- 3秒間隔のポーリングで新着取得
- イベントログの自動送信

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

http://localhost:3207 でアクセスできます。

## 環境変数

`.env`ファイルを作成してAPI URLを設定できます（オプション）。

```bash
VITE_EASYAUTH_URL=http://localhost:3201
VITE_POCKETDATA_URL=http://localhost:3202
VITE_NOTICO_URL=http://localhost:3203
VITE_MONITOR_URL=http://localhost:3204
VITE_PROJECT_ID=chat-app
```

## 使用しているnanobase API

| API | 用途 |
|-----|------|
| EasyAuth | ユーザー認証 |
| PocketData | メッセージデータの保存 |
| Monitor | イベントログ |

## ライセンス

MIT
