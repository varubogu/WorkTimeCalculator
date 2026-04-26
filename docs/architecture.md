# アーキテクチャ

## 技術スタック

| 種別 | 採用技術 |
|------|----------|
| フロントエンド | React 18 + TypeScript |
| ビルドツール | Vite 5 |
| ランタイム / 本番サーバー | Bun |
| スタイル | 単一の CSS（`src/index.css`）+ CSS カスタムプロパティ |
| データ永続化 | ブラウザ `localStorage` |

本番サーバー（`server.ts`）は `dist/` の静的ファイルを配信するだけで、独自 API は存在しません。勤務データと設定は常にローカル保存です。祝日自動反映が ON の場合のみ、ブラウザから Holidays JP API へ祝日の日付リストを取得します。

## ディレクトリ構造

```
WorkTimeCalculator/
├── index.html              # Vite エントリ HTML
├── vite.config.ts          # Vite 設定（public/ は標準の静的アセット置き場）
├── server.ts               # Bun 本番サーバー（dist/ を配信）
├── package.json
├── tsconfig.*.json
│
├── src/
│   ├── main.tsx            # React エントリ（ReactDOM.createRoot）
│   ├── App.tsx             # ルートコンポーネント・状態管理
│   ├── index.css           # 全スタイル（CSS 変数）
│   │
│   ├── types.ts            # 型定義（Entry, DayData, Settings, Lang ...）
│   ├── i18n.ts             # 翻訳（ja / en）
│   ├── holidays.ts         # 日本の祝日取得とフォールバックデータ
│   ├── storage.ts          # localStorage 読み書きヘルパー
│   ├── utils.ts            # 時刻計算、月データ生成、CSV/JSON エクスポート
│   │
│   └── components/         # UI コンポーネント
│       ├── AppHeader.tsx
│       ├── Sidebar.tsx
│       ├── MonthCalendar.tsx
│       ├── YearTimelineChart.tsx
│       ├── RangeProgress.tsx
│       ├── DeltaChip.tsx
│       ├── Legend.tsx
│       ├── DayModal.tsx
│       └── SettingsModal.tsx
│
├── public/                 # 任意の静的アセット（Vite が dist/ 直下へコピー）
├── dist/                   # vite build の出力（本番配信対象）
└── docs/                   # 本ドキュメント
```

## レイヤー構成

```
┌────────────────────────────────────────────────────────┐
│  UI 層（components/）                                   │
│  AppHeader / Sidebar / MonthCalendar / YearTimeline... │
└───────────────────────┬────────────────────────────────┘
                        │ props / callbacks
┌───────────────────────┴────────────────────────────────┐
│  アプリ状態（App.tsx）                                  │
│  settings, lang, dark, year, monthIdx, editDay...      │
└───────────────────────┬────────────────────────────────┘
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   ┌────────┐     ┌──────────┐     ┌───────────┐
   │ utils  │     │ storage  │     │ holidays  │
   │ 時刻計算│     │ localSto │     │ 祝日判定  │
   │ 集計    │     │ rage I/O │     │ API取得   │
   └────────┘     └──────────┘     └───────────┘
```

## データフロー

### 読み取り

1. `App` が初期化時に `loadSettings()` と `loadSettingsPeriods()` を呼び、共通設定と適用開始日キー付き設定を取得。
2. 祝日自動反映が有効な期間がある場合、`loadHolidayDates(year)` が Holidays JP API または `localStorage` キャッシュから祝日を取得。
3. `buildMonthsData(year, preferences, settingsPeriods, holidayDates)` が 12ヶ月分の `MonthData[]` を生成。
   - 各日について `resolveSettingsForDate()` で有効な設定を解決し、`getRealMonthData` が `loadEntry(dateStr, breakMin)` で localStorage から `Entry` を取得。
   - 種別（`reg` / `ot` / `off` / `vac` / `holi` / `wknd`）と実働時間（`hrs`）を計算。
4. 設定ダイアログを開くときは、表示中の月初日に対して `resolveSettingsPeriodKeyForDate()` で有効な期間キーを解決し、その期間を初期選択する。
5. `MonthData[]` は `useMemo` でキャッシュされ、`year`・`preferences`・`settingsPeriods`・`holidayDates`・`tick`（更新カウンタ）に依存。

### 書き込み

1. ユーザーが日セルをクリック → `DayModal` 表示。
2. 保存時に `saveEntry(dateStr, entry)` で `localStorage` に書き込み、`tick` をインクリメント。
3. `tick` の変化により `monthsData` が再計算され UI が更新。

### 状態の所在

| データ | 保管場所 | キー |
|--------|----------|------|
| 日次エントリ | `localStorage` | `wtc_YYYY-MM-DD` |
| 共通設定 | `localStorage` | `wtc_settings` |
| 適用開始日キー付き設定 | `localStorage` | `wtc_settings_periods` |
| 祝日キャッシュ | `localStorage` | `wtc_holidays_YYYY`（7日で再取得） |
| 現在の年・月・ビュー・モーダル状態 | React state（メモリ） | — |

## ビルドと配信

- `vite build` → TypeScript チェック（`--noEmit`）後、`dist/` に静的成果物を出力。
- `public/` に置いた静的アセットは Vite 標準の挙動で `dist/` 直下へコピーされる。
  - アプリ本体の HTML / CSS / JS は `index.html` と `src/` に置く。
  - `public/` には `favicon.svg` や `robots.txt` など、変換不要でそのまま配信したいファイルだけを置く。
- `server.ts` は Bun.serve で `dist/` を配信。
  - `.html` は `Cache-Control: no-cache`
  - その他は `public, max-age=31536000, immutable`
  - 不明パスは `dist/index.html` にフォールバック（SPA 対応）
  - `..` を含むパスは 403

## 設計ポリシー

- **サーバー処理ゼロ**: 独自バックエンドなし。勤務データはローカル保存。
- **ビルドステップあり / 依存は最小**: React と React DOM のみの実行時依存。
- **単一 CSS**: CSS カスタムプロパティでテーマ切替。CSS-in-JS やフレームワークは不使用。
- **型安全**: すべて TypeScript で記述。`any` は避ける。
