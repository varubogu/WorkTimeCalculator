import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Lang, Translations } from "../types";
import DropdownActionButton from "./DropdownActionButton";
import { DownloadIcon, MenuIcon, SettingsIcon, UploadIcon } from "./icons";

interface MenuItem {
  label: string;
  onSelect: () => void;
}

interface Props {
  t: Translations;
  lang: Lang;
  onLang: (lang: Lang) => void;
  dark: boolean;
  onDark: () => void;
  onSettings: () => void;
  importItems: MenuItem[];
  exportItems: MenuItem[];
  mobileMenu?: (close: () => void) => ReactNode;
}

export default function AppHeader({
  t,
  lang,
  onLang,
  dark,
  onDark,
  onSettings,
  importItems,
  exportItems,
  mobileMenu,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-header">
      <div className="brand">
        <div className="logo">W</div>
        <span>{t.brand}</span>
      </div>
      <div className="row gap-8 app-header-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <span className="mono muted mobile-moved-action" style={{ fontSize: 11 }}>{t.tagline}</span>
        <select
          className="mobile-moved-action"
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
        <DropdownActionButton label={t.import} items={importItems} icon={<UploadIcon />} iconOnly />
        <DropdownActionButton label={t.export} items={exportItems} icon={<DownloadIcon />} iconOnly />
        <button className="btn sm mobile-moved-action" onClick={onDark}>{dark ? "☀" : "☾"}</button>
        <button className="btn sm icon-btn mobile-moved-action" onClick={onSettings} aria-label={t.settings} title={t.settings}>
          <SettingsIcon />
        </button>
      </div>
      {mobileMenu && (
        <div className="mobile-menu-wrap mobile-only" ref={mobileMenuRef}>
          <button
            className="btn sm icon-btn"
            type="button"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-label={t.menu}
            aria-expanded={mobileMenuOpen}
            aria-haspopup="menu"
            title={t.menu}
          >
            <MenuIcon />
          </button>
          {mobileMenuOpen && (
            <div className="mobile-menu-panel" role="menu">
              {mobileMenu(closeMobileMenu)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
