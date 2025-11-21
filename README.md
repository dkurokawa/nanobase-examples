# nanobase-examples

nanobaseを使用したサンプルアプリケーション集

## アプリ一覧

### todo-app
Todoアプリ - 認証、データ管理、リマインダー通知

### chat-app
チャットアプリ - ルーム、メッセージ、既読管理、プッシュ通知

### game-app
ゲームアプリ - セーブデータ、リーダーボード、実績システム

### recipes
レシピ管理アプリ

## セットアップ

```bash
pnpm install
```

## 開発

```bash
# 全アプリを起動
pnpm dev

# 特定のアプリを起動
pnpm dev --filter=todo-app
```

## ビルド

```bash
pnpm build
```

## 構成

- Turbo (モノレポ管理)
- TypeScript
- Vite (フロントエンド)
