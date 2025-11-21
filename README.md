# nanobase-examples

[nanobase](https://nanobase.cc)を使用したサンプルアプリケーション集

## nanobaseとは？

認証・データベース・通知・監視を1つのサブスクで。小規模チームのためのシンプルなBaaS。

### 🎯 圧倒的なシンプルさ

```typescript
// 何も考えなくていい
const todos = await data.list('todos')
```

PostgreSQL？RLS？リレーション？**全部不要。**

### 🤖 AIコーディング最適化

- エンドポイントが素直（`/api/v1/data/todos`）
- エラーメッセージが日本語
- LLMが間違えにくいAPI設計

Cursor、Claude、ChatGPTでのVibe Codingに最適化。

### 4つのAPI

| API | 説明 | デフォルトポート |
|-----|------|-----------------|
| 🔐 EasyAuth | 認証 | 3201 |
| 📦 PocketData | データベース | 3202 |
| 📬 Notico | 通知 | 3203 |
| 📊 Monitor | 監視 | 3204 |

## アプリ一覧

| アプリ | ポート | 説明 | 使用API |
|--------|--------|------|---------|
| **recipes-app** | 3205 | レシピ管理アプリ | EasyAuth, PocketData, Monitor |
| **todo-app** | 3206 | Todoアプリ（期限リマインダー付き） | EasyAuth, PocketData, Notico |
| **chat-app** | 3207 | リアルタイムチャット | EasyAuth, PocketData, Monitor |
| **game-app** | 3208 | クリッカーゲーム（ランキング付き） | EasyAuth, PocketData, Monitor |

## セットアップ

```bash
# 依存関係インストール
pnpm install

# nanobase APIサービスを起動（別ターミナル）
# nanobaseリポジトリで docker-compose up -d

# サンプルアプリを起動
pnpm dev --filter=recipes-app
```

## 開発

```bash
# 特定のアプリを起動
pnpm dev --filter=todo-app
pnpm dev --filter=chat-app
pnpm dev --filter=game-app

# 全アプリをビルド
pnpm build
```

## API設定

各アプリは環境変数でAPI URLを設定できます：

```bash
VITE_EASYAUTH_URL=http://localhost:3201
VITE_POCKETDATA_URL=http://localhost:3202
VITE_NOTICO_URL=http://localhost:3203
VITE_MONITOR_URL=http://localhost:3204
```

## 構成

- Turbo (モノレポ管理)
- TypeScript
- React
- Vite

## ライセンス

MIT
