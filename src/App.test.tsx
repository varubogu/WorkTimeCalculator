import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function setHolidayCache(year: number, dates: string[] = []) {
  localStorage.setItem(`wtc_holidays_${year}`, JSON.stringify({ savedAt: Date.now(), dates }));
}

function readEntry(date: string) {
  const raw = localStorage.getItem(`wtc_${date}`);
  if (!raw) throw new Error(`Missing entry: ${date}`);
  return JSON.parse(raw) as { start: string; end: string; brk: number; vac: boolean };
}

describe("App bulk regular fill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    localStorage.clear();
    setHolidayCache(2026);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("通常クリックは未入力日のみを確認なしで定時入力する", () => {
    localStorage.setItem("wtc_2026-04-01", JSON.stringify({
      start: "10:00",
      end: "11:00",
      brk: 0,
      vac: false,
    }));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);

    const desktop = document.querySelector(".desktop-only") as HTMLElement;
    fireEvent.click(within(desktop).getByRole("button", { name: "定時を一括入力" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(readEntry("2026-04-01")).toMatchObject({ start: "10:00", end: "11:00", brk: 0, vac: false });
    expect(readEntry("2026-04-02")).toMatchObject({ start: "09:00", end: "18:00", brk: 60, vac: false });
  });

  it("右クリックメニューから上書き入力を選べる", () => {
    localStorage.setItem("wtc_2026-04-01", JSON.stringify({
      start: "10:00",
      end: "11:00",
      brk: 0,
      vac: false,
    }));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);

    const desktop = document.querySelector(".desktop-only") as HTMLElement;
    fireEvent.contextMenu(within(desktop).getByRole("button", { name: "定時を一括入力" }));
    fireEvent.click(within(desktop).getByRole("menuitem", { name: "全て入力（入力済みのものを上書き）" }));

    expect(confirmSpy).toHaveBeenCalledWith("入力済みの日があります。上書きしますか？");
    expect(readEntry("2026-04-01")).toMatchObject({ start: "09:00", end: "18:00", brk: 60, vac: false });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
