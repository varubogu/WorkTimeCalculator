# コンポーネント仕様

すべて [src/components/](../src/components/) 配下の関数コンポーネント。親（[App.tsx](../src/App.tsx)）から props で状態と callback を受け取る単方向データフロー。

## 一覧

| コンポーネント | 役割 |
|----------------|------|
| [AppHeader](#appheader) | 上部ヘッダ：ブランド・言語切替・読み込み・書き出し・ダーク・設定ボタン |
| [Sidebar](#sidebar) | 左サイドバー：年合計・月別進捗 |
| [MonthCalendar](#monthcalendar) | メインの月カレンダー |
| [YearTimelineChart](#yeartimelinechart) | 年間の月別折れ線チャート |
| [RangeProgress](#rangeprogress) | 目標範囲 / 実績のプログレスバー |
| [DeltaChip](#deltachip) | 目標との差分チップ（過不足ラベル） |
| [Legend](#legend) | カレンダー下部の凡例 |
| [DayModal](#daymodal) | 日付クリック時の入力ダイアログ |
| [SettingsModal](#settingsmodal) | 設定ダイアログ |

---

## AppHeader

[src/components/AppHeader.tsx](../src/components/AppHeader.tsx)

アプリ上部のヘッダ。ブランド表示と、言語切替・読み込み・書き出し・ダークモード切替・設定モーダル起動のコントロール。読み込み・書き出し・設定はアイコンボタンで表示する。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `t` | `Translations` | i18n 辞書 |
| `lang` | `Lang` (`"ja" \| "en"`) | 現在の言語 |
| `onLang` | `(lang: Lang) => void` | 言語切替 |
| `dark` | `boolean` | ダーク有効かどうか |
| `onDark` | `() => void` | ダークトグル |
| `onSettings` | `() => void` | 設定モーダルを開く |

---

## Sidebar

[src/components/Sidebar.tsx](../src/components/Sidebar.tsx)

デスクトップ時のみ表示される左サイドバー。年合計・年目標プログレス・月別リストを持つ。ファイルの読み込み・書き出しはヘッダのアイコンボタンに集約する。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `year` | `number` | 表示中の年 |
| `monthIdx` | `number` | 選択中の月（0–11） |
| `monthsData` | `MonthData[]` | 12ヶ月分のデータ |
| `settings` | `Settings` | 設定（年目標などを参照） |
| `t` | `Translations` | i18n 辞書 |
| `onPickMonth` | `(m: number) => void` | 月選択 |

**挙動**

- 月ドット色: 月合計が `monthTargetMin` 未満なら warn、`monthTargetMax` 超過なら bad、範囲内なら ok。
- 月クリック: `onPickMonth` で選択月を切り替える。

---

## MonthCalendar

[src/components/MonthCalendar.tsx](../src/components/MonthCalendar.tsx)

7列×可変行の月カレンダー。先頭は月初の曜日に合わせて空セル、末尾も 7 の倍数になるまでパディング。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `year` | `number` | 年 |
| `month` | `number` | 月（0–11） |
| `data` | `DayData[]` | 当該月の日データ |
| `t` | `Translations` | i18n 辞書 |
| `showHolidayTint` | `boolean` | 祝日セルの色付けを有効にするか（任意、既定 `true`） |
| `onDayClick` | `(day: DayData) => void` | 日セルクリック |

**セルのクラス適用規則**

| 条件 | 付与クラス |
|------|-----------|
| 今日 | `today` |
| `kind === "vac"` | `vac` |
| `kind === "wknd"` | `wknd` |
| 祝日 + `showHolidayTint` | `holiday` |
| 非平日（`!isWorking`） | `weekend` |
| `kind === "off" \| "holi"` かつ `entry.start` 未設定 | `off` |

アイコンチップ（`ot` / `vac` / `wknd`）は `kind` に応じて表示。

---

## YearTimelineChart

[src/components/YearTimelineChart.tsx](../src/components/YearTimelineChart.tsx)

SVG で描画する年間の月別折れ線。目標バンド、Y軸目盛、現在月マーカー、ホバーツールチップを備える。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `monthsData` | `MonthData[]` | 12ヶ月分のデータ |
| `year` | `number` | 年（ツールチップ表示用） |
| `targetMin` | `number` | 月目標の下限 |
| `targetMax` | `number` | 月目標の上限 |
| `currentMonthIdx` | `number` | 現在選択中の月（縦線で強調） |
| `onPickMonth` | `(m: number) => void` | 月選択 |
| `height` | `number` | SVG 高さ（任意、既定 260） |
| `t` | `Translations` | i18n 辞書 |

**特徴**

- `ResizeObserver` で幅を追従し、レスポンシブに再描画。
- Y 軸上限は `targetMax * 1.2` と実績の最大値を比較し、40h 刻みに切り上げ。
- 点クリックでその月へジャンプ。

---

## RangeProgress

[src/components/RangeProgress.tsx](../src/components/RangeProgress.tsx)

3 ゾーン（不足 / 範囲内 / 超過）の背景と、実績位置のマーカーを持つプログレスバー。
背景色はサイドバーの月ドットと同じアクセント色（warn / ok / bad）をそのまま使い、ライト / ダークでテーマ別の色定義に追従する。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `min` | `number` | 目標下限 |
| `max` | `number` | 目標上限 |
| `value` | `number` | 実績 |
| `hardMax` | `number` | バー全体の最大値（任意、未指定時は `max * 1.3` などから自動算出） |
| `height` | `number` | バー高（既定 22） |

---

## DeltaChip

[src/components/DeltaChip.tsx](../src/components/DeltaChip.tsx)

`value` が `[min, max]` の範囲にあるかを判定し、"✓ 範囲内" / "+Xh 超過" / "−Xh 不足" の小さなチップを表示。

**Props**: `value`, `min`, `max`, `t`

---

## Legend

[src/components/Legend.tsx](../src/components/Legend.tsx)

カレンダー下部の凡例。`overtime` / `vacation` / `weekendWork` / `holiday` / `inRange` の 5 アイコン。

**Props**: `t`

---

## DayModal

[src/components/DayModal.tsx](../src/components/DayModal.tsx)

日付セルをクリックしたときに開く入力ダイアログ。開始時刻・終了時刻・休憩（分）・休暇チェックを編集できる。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `dayObj` | `DayData` | 対象日 |
| `year` / `month` | `number` | ヘッダ表示用 |
| `settings` | `Settings` | デフォルト休憩時間と時刻入力の刻み取得に利用 |
| `t` | `Translations` | i18n 辞書 |
| `onSave` | `(entry: Entry \| null) => void` | 保存時。`null` が渡される場合は削除扱い |
| `onClose` | `() => void` | 閉じる |

**挙動**

- 保存ボタン: `onSave(entry)` を呼ぶ（localStorage への書き込みは呼び出し側で行う）。
- クリアボタン: `clearEntry(dateStr)` で当該日の localStorage を削除し `onSave(null)` を呼ぶ。
- 休暇チェック時は時刻・休憩入力が無効化される。
- 開始・終了が両方入力され休暇でなければ、下部に計算済み労働時間を表示。
- 開始・終了時刻の入力刻みは `settings.timeStepMin` を使う。

---

## SettingsModal

[src/components/SettingsModal.tsx](../src/components/SettingsModal.tsx)

設定ダイアログ。1日の定時時間、定時開始時刻、時刻入力の刻み、デフォルト休憩、月目標の最小/最大、年目標の最小/最大、祝日自動反映フラグに加え、有効期間付き設定を `開始日 ～ 終了日` のプルダウンで切り替えて編集する。初期状態では `null ～ null` 相当の空欄期間が 1 件あり、開始日を設定すると前半期間を残したまま新しい期間へ自動分割する。

**Props**

| 名前 | 型 | 説明 |
|------|------|------|
| `settings` | `Settings` | 現在の設定（初期値） |
| `settingsPeriods` | `SettingsPeriod[]` | 現在の期間設定（初期値） |
| `t` | `Translations` | i18n 辞書 |
| `onSave` | `(s: Settings, periods: SettingsPeriod[]) => void` | 保存時 |
| `onClose` | `() => void` | 閉じる |

内部でローカル `useState` により編集中の値を保持し、保存時に親へ渡す。期間設定はプルダウンで編集対象を切り替え、`＋` ボタンから開始日・終了日を入力して追加できる。編集対象が `null` 開始の期間で、開始日を初めて設定した場合は元期間を `null ～ 開始日` に残しつつ、新しい期間を `開始日 ～ 終了日` として追加する。

画面高さが不足する場合はダイアログ全体をビューポート内に収め、設定本文だけを縦スクロールする。ヘッダと保存 / キャンセルの操作列はスクロール外に固定される。

`dayHours` は `7.5` のような小数入力に対応する。`dayStart` は `type="time"` の入力で編集し、定時一括入力時の開始時刻として利用される。終了時刻は `dayHours` と `breakMin` から [utils.ts](../src/utils.ts) の `addMinutesToTime` で計算するため、SettingsModal では保存しない。`timeStepMin` は設定画面と日次入力の時刻入力刻みに使う。
