# 開発ガイド

## 前提

- Bun がインストール済みであること（`bun -v` で確認）
- Node モジュールは Bun が管理（`bun install` を利用）

## セットアップ

```bash
bun install
```

## よく使うコマンド

| コマンド | 用途 |
|----------|------|
| `bun dev` | Vite の開発サーバー（HMR 付き）。通常はこれで開発する |
| `bun run build` | TypeScript 型チェック → `dist/` にビルド |
| `bun run test` | Vitest の単体・コンポーネントテストを実行 |
| `bun run test:e2e` | Playwright の E2E テストを実行 |
| `bun run preview` | ビルド済み `dist/` を Vite の preview で確認 |
| `bun start` | Bun 本番サーバー（`server.ts`）を起動し `dist/` を配信 |

ポートは `PORT` 環境変数で変更可能（デフォルト 3000）:

```bash
PORT=8080 bun start
```

## 開発フロー

1. `bun dev` で開発サーバーを起動（Vite の HMR で即時反映）。
2. 機能を実装・修正。
3. `bun run test` で単体・コンポーネントテストが通るか確認。
4. 主要導線を変更した場合は `bun run test:e2e` で E2E テストを確認。
5. `bun run build` で型チェックとビルドが通るか確認。
6. 必要に応じ `bun start` で本番配信の挙動を確認。

> TypeScript の型チェックは `bun run build` のタイミングで走ります（`tsc --noEmit`）。ビルド前に手動で確認したい場合は `bunx tsc -p tsconfig.app.json --noEmit` を実行。

テストの詳しい実行方法と追加方針は [testing.md](./testing.md) を参照してください。

## 設定ファイル

| ファイル | 役割 |
|----------|------|
| `vite.config.ts` | Vite 設定。`public/` は Vite 標準の静的アセット置き場 |
| `tsconfig.json` | ルート tsconfig（`app` と `node` の参照をまとめる） |
| `tsconfig.app.json` | アプリコード（`src/`）用 |
| `tsconfig.node.json` | Vite 設定ファイル自体用 |

## 新機能の追加手順

### 新しい設定項目を追加する

例: 「1日の目標残業時間」を追加する場合。

1. **型を拡張** — [src/types.ts](../src/types.ts) の `Settings` に項目を追加。
2. **デフォルト値とマージ処理** — [src/storage.ts](../src/storage.ts) の `defaultSettings()` と `mergeSettings()` にキーを追加。
3. **UI を追加** — [src/components/SettingsModal.tsx](../src/components/SettingsModal.tsx) に行を足す。
4. **翻訳ラベル** — [src/i18n.ts](../src/i18n.ts) の `ja` と `en` 両方に追加し、[src/types.ts](../src/types.ts) の `Translations` にキーを追加。
5. **利用側** — `App.tsx` の `settings` 経由で参照。

既存ユーザーの `wtc_settings` には新しいキーが存在しないため、`mergeSettings()` で必ず後方互換のデフォルト値を補完してください。時刻設定を追加する場合は、`dayStart` と同様に不正な `"HH:MM"` を保存値として採用しないチェックを入れます。

### 新しいコンポーネントを追加する

1. [src/components/](../src/components/) に `.tsx` ファイルを作成。
2. `interface Props {}` を宣言し、`default export` する。
3. [src/App.tsx](../src/App.tsx) でインポートして使用。
4. スタイルは [src/index.css](../src/index.css) にクラスを追加（CSS 変数を活用）。

### 静的アセットを追加する

変換不要でそのまま配信したいファイル（例: `favicon.svg`, `robots.txt`）は Vite 標準に従って `public/` に置き、`/favicon.svg` のような絶対パスで参照します。

アプリ本体の HTML / CSS / JS は `public/` には置かず、ルートの [index.html](../index.html) と [src/](../src/) 配下で管理してください。`public/` 配下に置いた JS は Vite の React エントリとしてはビルドされません。

### 祝日データを更新する

[src/holidays.ts](../src/holidays.ts) は Holidays JP API から表示年の日本祝日を取得します。API 取得に失敗した場合は同梱の固定祝日セット（現在 2024–2027）を使うため、フォールバック用データは必要に応じて更新してください。

## コーディング規約（緩やか）

- TypeScript の型は省略しない（`any` 回避）。
- スタイルは CSS 変数を経由する（`var(--ink)` など）。直接色を書かない。
- localStorage アクセスは必ず `storage.ts` のヘルパー経由。
- 時刻計算は `utils.ts` の関数（`timeToMinutes` / `netMinutes` / `addMinutesToTime` / `fmtH`）を再利用。

## デプロイ

1. `bun run build` で `dist/` を生成。
2. `dist/` を任意の静的ホスティングに配置、もしくは `bun start` で同梱サーバーを起動。
3. クライアントのみで完結するため、サーバー側の環境変数や DB は不要。
