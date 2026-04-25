# データモデルとストレージ仕様

本アプリは **勤務データと設定をサーバーに送らず、`localStorage` に保存** します。祝日自動反映が ON の場合のみ、祝日の日付リストを外部 API から取得します。

## localStorage キー

| キー | 型 (JSON) | 内容 |
|------|-----------|------|
| `wtc_YYYY-MM-DD` | `Entry` | 1 日分の勤務記録（例: `wtc_2026-04-19`） |
| `wtc_settings` | `Settings` | アプリ設定 |
| `wtc_settings_periods` | `SettingsPeriod[]` | 有効期間付き設定の上書きルール |
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
  monthOvertimeTargetMin: number; // 月残業目標 下限
  monthOvertimeTargetMax: number; // 月残業目標 上限
  yearTargetMin:  number;  // 年目標 下限
  yearTargetMax:  number;  // 年目標 上限
  yearOvertimeTargetMin: number;  // 年残業目標 下限
  yearOvertimeTargetMax: number;  // 年残業目標 上限
  breakMin:       number;  // デフォルト休憩（分）
  showHolidays:   boolean; // 祝日自動反映
  lang:           Lang;    // "ja" | "en"
  dark:           boolean; // ダークモード
}
```

### `SettingsPeriod` — 有効期間付き設定

```ts
interface SettingsPeriod {
  effectiveFrom: string | null; // null または "YYYY-MM-DD"
  effectiveTo: string | null;   // null または "YYYY-MM-DD"
  overrides: {
    dayHours?: number;
    dayStart?: string;
    timeStepMin?: number;
    breakMin?: number;
    showHolidays?: boolean;
  };
}
```

`effectiveFrom` / `effectiveTo` は `null` を許容し、`null` は始端または終端が未指定であることを表します。初期状態では `null` 〜 `null` の期間が 1 件自動作成されます。開始日を設定すると、その期間は `null` 〜 新しい開始日 と 新しい開始日 〜 新しい終了日 に分割されます。

期間内では `baseSettings` に対して `overrides` が上書き適用されます。現在の UI では、勤務計算に影響の大きい `dayHours` / `dayStart` / `timeStepMin` / `breakMin` を主対象として編集できます。いずれの期間にも属さない日付がある場合、カレンダー表示時に「設定が存在しない期間があります」と警告を出します。

デフォルト値（`defaultSettings()`）:

| キー | 値 |
|------|----|
| `dayHours` | 8 |
| `dayStart` | `"09:00"` |
| `timeStepMin` | 15 |
| `monthTargetMin` | 140 |
| `monthTargetMax` | 180 |
| `monthOvertimeTargetMin` | 0 |
| `monthOvertimeTargetMax` | 45 |
| `yearTargetMin` | 1680 |
| `yearTargetMax` | 2160 |
| `yearOvertimeTargetMin` | 0 |
| `yearOvertimeTargetMax` | 360 |
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
  regularDayHours: number;
  defaultDayStart: string;
  defaultBreakMin: number;
  timeStepMin: number;
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
7. `hrs > regularDayHours` → `"ot"`
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

### `sumOvertimeHours(data: DayData[], regularDayHours: number): number`

残業時間の合計を小数 1 桁で返します。

- 平日は `max(0, hrs - regularDayHours)` を採用
- 土日・祝日の勤務は `hrs` 全量を残業として採用
- 休暇日は 0

## ストレージヘルパー

出典: [storage.ts](../src/storage.ts)

| 関数 | 役割 |
|------|------|
| `loadEntry(dateStr, defaultBreak)` | localStorage から `Entry` を読む。未設定時は空の Entry を返す（`brk` は `defaultBreak` を使用） |
| `saveEntry(dateStr, entry)` | 指定日の `Entry` を保存 |
| `clearEntry(dateStr)` | 指定日のエントリを削除 |
| `loadSettings()` | 設定を読み、`mergeSettings` でデフォルトと合成 |
| `loadSettingsPeriods()` | 有効期間付き設定を読み込む |
| `saveSettings(s)` | 設定を保存 |
| `saveSettingsPeriods(periods)` | 有効期間付き設定を保存 |
| `defaultSettings()` | デフォルト設定を返す |
| `ensureSettingsPeriods(base, periods)` | 期間が空なら `null` 〜 `null` の初期期間を補う |
| `mergeSettings(partial)` | 部分的な設定をデフォルトと合成して完全な `Settings` にする |
| `mergeSettingsPeriods(periods)` | 期間設定を正規化してソートする |
| `resolveSettingsForDate(base, periods, dateStr)` | 指定日に有効な設定を返す。未設定なら `null` |
| `findFirstMissingSettingsDate(periods, start, end)` | 範囲内で最初に未設定となる日付を返す |
| `isoDate(y, m, d)` | `YYYY-MM-DD` を生成（月は 0 起点で受け取り） |

いずれも `try/catch` で JSON パース失敗を吸収し、壊れたデータでアプリが落ちないようにしています。

`mergeSettings` は既存ユーザーの `wtc_settings` に新しい設定キーが存在しない場合も、`defaultSettings()` の値で補完します。`dayStart` は `"HH:MM"` として妥当な値のみ採用し、不正な値は `"09:00"` に戻します。

## 祝日データ

[src/holidays.ts](../src/holidays.ts) は Holidays JP API から表示年の日本祝日を取得します。取得した日付配列は `wtc_holidays_YYYY` に 7 日間キャッシュされ、`showHolidays` が有効なときだけ `getRealMonthData` が参照します。

API 取得に失敗した場合は、同ファイル内の 2024–2027 の固定祝日セットへフォールバックします。フォールバック用データは年次で更新してください。

## ファイル形式

出典: [src/fileFormats.ts](../src/fileFormats.ts)

### 作業時間ファイル

JSON / YAML 共通構造:

```json
{
  "$schema": "https://example.com/schemas/wtc-work-entries.schema.json",
  "schema": "wtc-work-entries/v1",
  "entries": [
    { "date": "2026-04-19", "start": "09:00", "end": "18:00", "breakMin": 60, "vacation": false }
  ]
}
```

CSV ヘッダ:

```text
date,start,end,breakMin,vacation
```

### 設定ファイル

JSON / YAML 共通構造:

```json
{
  "$schema": "https://example.com/schemas/wtc-settings.schema.json",
  "schema": "wtc-settings/v1",
  "baseSettings": {
    "dayHours": 8,
    "dayStart": "09:00"
  },
  "periods": [
    {
      "effectiveFrom": null,
      "effectiveTo": "2026-06-30",
      "overrides": { "dayHours": 7.5, "dayStart": "08:30", "breakMin": 45 }
    }
  ]
}
```

`src/fileFormats.ts` には JSON Schema 定義（`WORK_ENTRIES_JSON_SCHEMA`, `SETTINGS_JSON_SCHEMA`）と、内容検証用のバリデータを置いています。配信用のスキーマ実体は `public/schemas/` にあり、ビルド後は `/schemas/wtc-work-entries.schema.json` と `/schemas/wtc-settings.schema.json` で同一ホストから参照できます。JSON / YAML のエクスポートには `$schema` が付きます。

`$schema` のベースURLは `VITE_SCHEMA_BASE_URL` で指定できます。未指定の場合はブラウザの現在のオリジンを使い、同一ホストの `/schemas/` を指します。

## エクスポート / インポート

### CSV

[utils.ts](../src/utils.ts) `exportCSV(monthsData, year)`

列: `date,start,end,breakMin,vacation`

入力済みの日のみ出力。ファイル名: `workhours-{year}.csv`。

### JSON

作業時間ファイルと設定ファイルの両方を出力できます。設定ファイルは `settings.json` / `settings.yaml` として保存されます。

### YAML

作業時間ファイルと設定ファイルの両方を YAML で出力できます。拡張子は `.yaml` です。

## データ移行・バックアップ

- 作業時間ファイルは CSV / JSON / YAML で読み込み可能です。
- 設定ファイルは JSON / YAML で読み込み可能です。
- インポート成功時は `localStorage` の内容を上書きします。
