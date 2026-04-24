import { useEffect, useRef, useState } from "react";

interface MenuItem {
  label: string;
  onSelect: () => void;
}

interface Props {
  label: string;
  items: MenuItem[];
  align?: "left" | "right";
}

export default function DropdownActionButton({ label, items, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="dropdown-action">
      <button
        type="button"
        className="btn sm"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label} ▾
      </button>
      {open && (
        <div className={`dropdown-menu ${align === "left" ? "left" : "right"}`} role="menu">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              className="dropdown-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
