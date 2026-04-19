import type { Lang, Translations } from "../types";

interface Props {
  t: Translations;
  lang: Lang;
  onLang: (lang: Lang) => void;
  dark: boolean;
  onDark: () => void;
  onSettings: () => void;
}

export default function AppHeader({ t, lang, onLang, dark, onDark, onSettings }: Props) {
  return (
    <div className="app-header">
      <div className="brand">
        <div className="logo">W</div>
        <span>{t.brand}</span>
      </div>
      <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <span className="mono muted" style={{ fontSize: 11 }}>{t.tagline}</span>
        <select
          value={lang}
          onChange={e => onLang(e.target.value as Lang)}
          style={{
            fontFamily: "JetBrains Mono,monospace", fontSize: 11,
            border: "1.5px solid var(--ink)", borderRadius: 4, padding: "2px 4px",
            background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
          }}
        >
          <option value="ja">JA 日本語</option>
          <option value="en">EN English</option>
        </select>
        <button className="btn sm" onClick={onDark}>{dark ? "☀" : "☾"}</button>
        <button className="btn sm" onClick={onSettings}>⚙ {t.settings}</button>
      </div>
    </div>
  );
}
