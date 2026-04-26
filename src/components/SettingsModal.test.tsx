import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import I18N from "../i18n";
import { defaultSettings, defaultSettingsPreferences, defaultSettingsPeriods } from "../storage";
import SettingsModal from "./SettingsModal";

describe("SettingsModal", () => {
  it("適用開始日プルダウンで編集対象を切り替える", () => {
    const periods = {
      "*": { ...defaultSettings(), dayHours: 7.5, dayStart: "08:30", breakMin: 45, timeStepMin: 30 },
      "2026-05-01": { ...defaultSettings(), dayHours: 6, dayStart: "10:00", breakMin: 30, timeStepMin: 15 },
    };

    render(
      <SettingsModal
        preferences={defaultSettingsPreferences()}
        settingsPeriods={periods}
        t={I18N.ja}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("1日の定時時間")).toHaveValue(7.5);

    fireEvent.change(screen.getByLabelText("編集する期間"), { target: { value: "2026-05-01" } });

    expect(screen.getByLabelText("1日の定時時間")).toHaveValue(6);
    expect(screen.getByLabelText("定時開始時刻")).toHaveValue("10:00");
  });

  it("* 期間を編集して保存でき、終了日UIは表示しない", () => {
    const onSave = vi.fn();

    render(
      <SettingsModal
        preferences={defaultSettingsPreferences()}
        settingsPeriods={defaultSettingsPeriods()}
        t={I18N.ja}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("編集する期間")).toHaveDisplayValue("*");
    expect(screen.getByLabelText("適用開始日")).toHaveValue("*");
    expect(screen.queryByLabelText("適用終了日")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("1日の定時時間"), { target: { value: "7.5" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        "*": expect.objectContaining({ dayHours: 7.5 }),
      }),
    );
  });

  it("新しい適用開始日を追加して保存できる", () => {
    const onSave = vi.fn();

    render(
      <SettingsModal
        preferences={defaultSettingsPreferences()}
        settingsPeriods={defaultSettingsPeriods()}
        t={I18N.ja}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "期間を追加" }));
    fireEvent.change(screen.getAllByLabelText("適用開始日")[0], { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getAllByRole("button", { name: "期間を追加" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        "*": expect.any(Object),
        "2026-06-01": expect.any(Object),
      }),
    );
  });
});
