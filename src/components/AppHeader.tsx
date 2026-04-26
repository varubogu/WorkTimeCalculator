import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Lang, ThemePreference, Translations } from "../types";
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
  theme: ThemePreference;
  dark: boolean;
  onDark: () => void;
  onTheme: (theme: ThemePreference) => void;
  onSettings: () => void;
  importItems: MenuItem[];
  exportItems: MenuItem[];
  mobileMenu?: (close: () => void) => ReactNode;
}

export default function AppHeader({
  t,
  lang,
  onLang,
  theme,
  dark,
  onDark,
  onTheme,
  onSettings,
  importItems,
  exportItems,
  mobileMenu,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const themeLongPressTimerRef = useRef<number | null>(null);
  const themeLongPressTriggeredRef = useRef(false);

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

  useEffect(() => {
    if (!themeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!themeMenuRef.current?.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setThemeMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [themeMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const clearThemeLongPressTimer = () => {
    if (themeLongPressTimerRef.current === null) return;
    window.clearTimeout(themeLongPressTimerRef.current);
    themeLongPressTimerRef.current = null;
  };
  const openThemeMenu = () => setThemeMenuOpen(true);
  const themeItems: { value: ThemePreference; label: string }[] = [
    { value: "light", label: t.themeLight },
    { value: "dark", label: t.themeDark },
    { value: "system", label: t.themeSystem },
  ];

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
        <div ref={themeMenuRef} className="dropdown-action">
          <button
            type="button"
            className="btn sm"
            onClick={event => {
              if (themeLongPressTriggeredRef.current) {
                event.preventDefault();
                themeLongPressTriggeredRef.current = false;
                return;
              }
              onDark();
            }}
            onContextMenu={event => {
              event.preventDefault();
              clearThemeLongPressTimer();
              openThemeMenu();
            }}
            onPointerDown={event => {
              if (event.pointerType === "mouse") return;
              clearThemeLongPressTimer();
              themeLongPressTriggeredRef.current = false;
              themeLongPressTimerRef.current = window.setTimeout(() => {
                themeLongPressTriggeredRef.current = true;
                openThemeMenu();
              }, 550);
            }}
            onPointerUp={clearThemeLongPressTimer}
            onPointerCancel={clearThemeLongPressTimer}
            onPointerLeave={clearThemeLongPressTimer}
            aria-label={t.dark}
            aria-haspopup="menu"
            aria-expanded={themeMenuOpen}
            title={t.dark}
          >
            {dark ? "☀" : "☾"}
          </button>
          {themeMenuOpen && (
            <div className="dropdown-menu right" role="menu">
              {themeItems.map(item => (
                <button
                  key={item.value}
                  type="button"
                  className={`dropdown-item${item.value === theme ? " active" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    setThemeMenuOpen(false);
                    onTheme(item.value);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
