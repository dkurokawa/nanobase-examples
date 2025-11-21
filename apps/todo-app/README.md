# Todo App

[nanobase API](https://nanobase.cc)を使ったTodoアプリのサンプルです。

認証・データ保存・通知機能をnanobase APIに任せることで、シンプルなコードでフル機能のアプリを実現しています。

## 機能

- ユーザー登録・ログイン
- タスクの作成・一覧・完了・削除
- 期限設定と統計表示
- 期限1日前のリマインダー通知

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

http://localhost:3206 でアクセスできます。

## 環境変数

`.env`ファイルを作成してAPI URLを設定できます（オプション）。

```bash
VITE_EASYAUTH_URL=http://localhost:3201
VITE_POCKETDATA_URL=http://localhost:3202
VITE_NOTICO_URL=http://localhost:3203
VITE_PROJECT_ID=todo-app
```

## 使用しているnanobase API

| API | 用途 |
|-----|------|
| EasyAuth | ユーザー認証 |
| PocketData | タスクデータの保存 |
| Notico | リマインダー通知 |

## ライセンス

MIT
