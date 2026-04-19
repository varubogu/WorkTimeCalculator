# データモデルとストレージ仕様

本アプリは **勤務データと設定をサーバーに送らず、`localStorage` に保存** します。祝日自動反映が ON の場合のみ、祝日の日付リストを外部 API から取得します。

## localStorage キー

| キー | 型 (JSON) | 内容 |
|------|-----------|------|
| `wtc_YYYY-MM-DD` | `Entry` | 1 日分の勤務記録（例: `wtc_2026-04-19`） |
| `wtc_settings` | `Settings` | アプリ設定 |
| `wtc_holidays_YYYY` | `{ savedAt, dates }` | Holidays JP API から取得した祝日の日付キャッシュ |

日付キーの生成は [storage.ts](../src/storage.ts) の `isoDate(year, month, day)`：月は 0 起点で受け取り、1 起点のゼロパディングで文字列化します。

## 型定義

出典: [src/types.ts](../src/types.ts)

### `Entry` — 1 日分の記録

```ts
interface Entry {
  start: string;  // "HH:MM"（空文字なら未入力）
  end:   string;  // "HH:MM"
  brk:   number;  // 休憩（分）
  vac:   boolean; // 休暇フラグ
}
```

### `Settings` — アプリ設定

```ts
interface Settings {
  dayHours:       number;  // 1 日の定時時間（時間）
  dayStart:       string;  // 定時開始時刻 "HH:MM"
  timeStepMin:    number;  // 時刻入力の刻み（分）
  monthTargetMin: number;  // 月目標 下限（時間）
  monthTargetMax: number;  // 月目標 上限
  yearTargetMin:  number;  // 年目標 下限
  yearTargetMax:  number;  // 年目標 上限
  breakMin:       number;  // デフォルト休憩（分）
  showHolidays:   boolean; // 祝日自動反映
  lang:           Lang;    // "ja" | "en"
  dark:           boolean; // ダークモード
}
```

デフォルト値（`defaultSettings()`）:

| キー | 値 |
|------|----|
| `dayHours` | 8 |
| `dayStart` | `"09:00"` |
| `timeStepMin` | 15 |
| `monthTargetMin` | 140 |
| `monthTargetMax` | 180 |
| `yearTargetMin` | 1680 |
| `yearTargetMax` | 2160 |
| `breakMin` | 60 |
| `showHolidays` | `true` |
| `lang` | `"ja"` |
| `dark` | `false` |

### `DayData` — ランタイム上の日データ

localStorage には保存されず、描画のたびに生成されます（[utils.ts](../src/utils.ts) `getRealMonthData`）。

```ts
interface DayData {
  d:         number;     // 1..31
  date:      Date;
  dow:       number;     // 0(日)..6(土)
  kind:      DayKind;
  hrs:       number;     // 実働時間（小数）
  isHoliday: boolean;
  isWorking: boolean;    // 月〜金なら true
  isToday:   boolean;
  dateStr:   string;     // "YYYY-MM-DD"
  entry:     Entry;
}

type DayKind = "reg" | "ot" | "off" | "vac" | "holi" | "wknd";
```

`kind` の決定ロジック（優先順位どおり）:

1. `entry.vac` → `"vac"`
2. 非平日（土日）かつ実働あり → `"wknd"`
3. 祝日かつ実働あり → `"ot"`（祝日出勤は残業扱い）
4. 祝日 → `"holi"`
5. 非平日 → `"off"`
6. 実働なし → `"off"`
7. `hrs > dayHours` → `"ot"`
8. それ以外 → `"reg"`

### `MonthData`

```ts
interface MonthData {
  m:    number;      // 0..11
  data: DayData[];   // その月の日配列（月初〜月末）
}
```

## 時刻計算ルール

すべて [utils.ts](../src/utils.ts) に集約。

### `timeToMinutes(t: string): number | null`

- `"HH:MM"` 形式の文字列を深夜 0 時からの分数に変換。
- 書式不正・範囲外（`h>23`, `m>59`）なら `null`。

### `netMinutes(start, end, brk): number | null`

実働分数 = `(end − start) − brk`。

- どちらかが不正、または `end <= start`（= 日またぎは未サポート）なら `null`。
- 結果は `0` 以上にクランプ。

> **日またぎ（例: 23:00 → 02:00）は未対応**。必要なら 2 レコード分けて入力する必要があります。

### `addMinutesToTime(start, minutes): string | null`

定時一括入力で終了時刻を計算するためのヘルパー。

- `start` に `minutes` を足して `"HH:MM"` を返します。
- `start` が不正、または結果が 24:00 以降になる場合は `null`。
- 一括入力では `dayStart + dayHours * 60 + breakMin` を計算し、`null` の場合は保存せず中断します。

### `fmtH(fractionalHours): string`

`12.5` → `"12h30"`、`8` → `"8h"` のように表示用整形。`null`/`undefined` は `"—"`。

### `sumHours(data: DayData[]): number`

日配列の `hrs` 合計を小数 1 桁に丸めて返す（月合計・年合計に使用）。

## ストレージヘルパー

出典: [storage.ts](../src/storage.ts)

| 関数 | 役割 |
|------|------|
| `loadEntry(dateStr, defaultBreak)` | localStorage から `Entry` を読む。未設定時は空の Entry を返す（`brk` は `defaultBreak` を使用） |
| `saveEntry(dateStr, entry)` | 指定日の `Entry` を保存 |
| `clearEntry(dateStr)` | 指定日のエントリを削除 |
| `loadSettings()` | 設定を読み、`mergeSettings` でデフォルトと合成 |
| `saveSettings(s)` | 設定を保存 |
| `defaultSettings()` | デフォルト設定を返す |
| `mergeSettings(partial)` | 部分的な設定をデフォルトと合成して完全な `Settings` にする |
| `isoDate(y, m, d)` | `YYYY-MM-DD` を生成（月は 0 起点で受け取り） |

いずれも `try/catch` で JSON パース失敗を吸収し、壊れたデータでアプリが落ちないようにしています。

`mergeSettings` は既存ユーザーの `wtc_settings` に新しい設定キーが存在しない場合も、`defaultSettings()` の値で補完します。`dayStart` は `"HH:MM"` として妥当な値のみ採用し、不正な値は `"09:00"` に戻します。

## 祝日データ

[src/holidays.ts](../src/holidays.ts) は Holidays JP API から表示年の日本祝日を取得します。取得した日付配列は `wtc_holidays_YYYY` に 7 日間キャッシュされ、`showHolidays` が有効なときだけ `getRealMonthData` が参照します。

API 取得に失敗した場合は、同ファイル内の 2024–2027 の固定祝日セットへフォールバックします。フォールバック用データは年次で更新してください。

## エクスポート

### CSV

[utils.ts](../src/utils.ts) `exportCSV(monthsData, year)`

列: `Date, Start, End, Break(min), Hours, Type`

実働がある日、または休暇の日のみ出力。ファイル名: `workhours-{year}.csv`。

### JSON

[utils.ts](../src/utils.ts) `exportJSON(monthsData, year)`

形式:

```json
{
  "2026-04-19": { "start": "09:00", "end": "18:00", "brk": 60, "vac": false },
  "2026-04-22": { "start": "", "end": "", "brk": 60, "vac": true }
}
```

ファイル名: `workhours-{year}.json`。

## データ移行・バックアップ

- 現状「インポート」機能は未実装（エクスポートのみ）。
- 端末・ブラウザを跨ぐ場合は JSON をエクスポートし、手動で localStorage を書き戻す必要があります。
