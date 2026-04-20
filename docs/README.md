# WorkTimeCalculator ドキュメント

SES エンジニア向けの作業時間シミュレーター。勤務データと設定はブラウザ内（`localStorage`）に保存され、サーバーには送信されません。

## ドキュメント一覧

| ドキュメント | 内容 |
|--------------|------|
| [architecture.md](./architecture.md) | 技術スタック、ディレクトリ構造、データフロー |
| [development.md](./development.md) | セットアップ、開発コマンド、ビルド、新機能の追加手順 |
| [components.md](./components.md) | 各 React コンポーネントの役割と props |
| [data-model.md](./data-model.md) | 型定義、localStorage キー、時刻計算ルール |
| [features.md](./features.md) | 機能仕様（カレンダー、チャート、設定、祝日など） |
| [testing.md](./testing.md) | 単体テスト、コンポーネントテスト、E2E テストの実行方法と追加方針 |

## 概要

- **技術スタック**: Vite + React 18 + TypeScript + Bun（本番サーバー）
- **データ保存**: 勤務データと設定は `localStorage`
- **祝日**: 日本の祝日を外部 API から取得し、失敗時は同梱データへフォールバック
- **対応言語**: 日本語 / 英語（i18n 切替）
- **テーマ**: ライト / ダーク

詳細は [architecture.md](./architecture.md) を参照してください。
