# 🍳 マイレシピ帳

[nanobase API](https://github.com/yourusername/kickstart-ppn)を使ったサンプルアプリケーションです。

認証・データ保存・ログ機能をnanobase APIに任せることで、シンプルなコードでフル機能のアプリを実現しています。

## 機能

- ユーザー登録・ログイン
- レシピの作成・一覧・削除
- イベント・エラーログの自動送信

## セットアップ

### 1. nanobase APIを起動

```bash
# kickstart-ppn リポジトリで
docker-compose up -d
```

### 2. このアプリを起動

```bash
npm install
npm run dev
```

http://localhost:3205 でアクセスできます。

## 環境変数

`.env`ファイルを作成してAPI URLを設定できます（オプション）。

```bash
VITE_EASYAUTH_URL=http://localhost:3201
VITE_POCKETDATA_URL=http://localhost:3202
VITE_MONITOR_URL=http://localhost:3204
VITE_PROJECT_ID=recipes-app
```

## 使用しているnanobase API

| API | 用途 |
|-----|------|
| EasyAuth | ユーザー認証 |
| PocketData | レシピデータの保存 |
| Monitor | イベント・エラーログ |

## ライセンス

MIT
