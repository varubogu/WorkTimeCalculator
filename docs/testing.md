# テスト

このプロジェクトでは、単体テストに Vitest、React コンポーネントテストに Testing Library、E2E テストに Playwright を使います。

## コマンド

| コマンド | 用途 |
|----------|------|
| `bun run test` | Vitest の単体・コンポーネントテストを 1 回実行 |
| `bun run test:watch` | Vitest を watch モードで実行 |
| `bun run test:e2e` | Playwright の E2E テストを実行 |
| `bun run test:e2e:ui` | Playwright UI モードで E2E テストを確認 |
| `bun run build` | 型チェックと本番ビルド |

Playwright のブラウザが未インストールの場合は、初回のみ次を実行します。

```bash
bunx playwright install
```

## 単体テスト

Vitest は `vite.config.ts` の `test` 設定で `jsdom` を使います。DOM マッチャーは `src/test/setup.ts` で `@testing-library/jest-dom/vitest` を読み込みます。

主な対象は次の通りです。

- `src/utils.test.ts`: 時刻変換、勤務分計算、表示フォーマット
- `src/storage.test.ts`: `localStorage` 保存・読み込み、設定マージ
- `src/components/*.test.tsx`: UI の表示と基本操作

時刻計算や保存形式はアプリ全体の前提になるため、仕様を変更した場合は関連テストも更新してください。

## E2E テスト

Playwright は `playwright.config.ts` の `webServer` で Vite 開発サーバーを `http://127.0.0.1:3000` に起動してからテストします。既に同じ URL でサーバーが動いている場合、ローカルでは既存サーバーを再利用します。

E2E はユーザー操作として重要な流れを確認します。

- 日付セルを開く
- 開始時刻、終了時刻、休憩時間を入力する
- 保存後に日付セルと月合計へ反映されることを確認する

`localStorage` は各テストの開始時にクリアします。勤務データや設定を前提にするテストでは、`page.addInitScript()` で必要な保存値をセットしてください。

## テスト追加時の方針

- 時刻計算、設定マージ、保存形式の変更は単体テストを追加する。
- コンポーネントの表示条件やクリック操作を変更した場合は Testing Library のテストを追加する。
- 複数コンポーネントをまたぐ主要導線は Playwright で確認する。
- E2E では CSS クラスより、ロールやラベルなどアクセシブルなセレクターを優先する。
