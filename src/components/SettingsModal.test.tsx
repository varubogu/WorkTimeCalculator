import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import I18N from "../i18n";
import { defaultSettings } from "../storage";
import type { SettingsPeriod } from "../types";
import SettingsModal from "./SettingsModal";

describe("SettingsModal", () => {
  it("期間プルダウンで編集対象を切り替える", () => {
    const periods: SettingsPeriod[] = [
      {
        effectiveFrom: null,
        effectiveTo: "2026-04-30",
        overrides: { dayHours: 7.5, dayStart: "08:30", breakMin: 45, timeStepMin: 30 },
      },
      {
        effectiveFrom: "2026-05-01",
        effectiveTo: "2026-05-31",
        overrides: { dayHours: 6, dayStart: "10:00", breakMin: 30, timeStepMin: 15 },
      },
    ];

    render(
      <SettingsModal
        settings={defaultSettings()}
        settingsPeriods={periods}
        t={I18N.ja}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("1日の定時時間")).toHaveValue(7.5);

    fireEvent.change(screen.getByLabelText("編集する期間"), { target: { value: screen.getByRole("option", { name: "2026-05-01 ～ 2026-05-31" }).getAttribute("value") } });

    expect(screen.getByLabelText("1日の定時時間")).toHaveValue(6);
    expect(screen.getByLabelText("定時開始時刻")).toHaveValue("10:00");
  });

  it("初期の null ～ null 期間に開始日を入れると期間を分割して保存できる", () => {
    const onSave = vi.fn();

    render(
      <SettingsModal
        settings={defaultSettings()}
        settingsPeriods={[]}
        t={I18N.ja}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("編集する期間")).toHaveDisplayValue("— ～ —");
    expect(screen.getByLabelText("適用開始日")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("適用開始日"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("適用終了日"), { target: { value: "2026-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.any(Object),
      [
        expect.objectContaining({
          effectiveFrom: null,
          effectiveTo: "2026-06-01",
        }),
        expect.objectContaining({
          effectiveFrom: "2026-06-01",
          effectiveTo: "2026-06-30",
        }),
      ],
    );
  });
});
