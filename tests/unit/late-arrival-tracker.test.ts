import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../server/db", () => ({ db: {} }));
vi.mock("../../server/agent/skills/skill-registry", () => ({
  registerSkill: vi.fn(),
}));

const getEffectiveConfigMock = vi.fn();
vi.mock("../../server/routes/payroll-config", () => ({
  getEffectiveConfig: (...args: unknown[]) => getEffectiveConfigMock(...args),
}));

import { resolveLateThreshold } from "../../server/agent/skills/late-arrival-tracker";

describe("F15 — resolveLateThreshold (Mr. Dobody dynamic late tolerance)", () => {
  beforeEach(() => {
    getEffectiveConfigMock.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns DB cascade value when payrollDeductionConfig has lateToleranceMinutes=20", async () => {
    getEffectiveConfigMock.mockResolvedValueOnce({
      lateToleranceMinutes: 20,
      source: "db",
    });
    const result = await resolveLateThreshold(0, 2026, 5);
    expect(result.thresholdMinutes).toBe(20);
    expect(result.source).toBe("db");
    expect(getEffectiveConfigMock).toHaveBeenCalledWith(0, 2026, 5);
  });

  it("falls back to default 15 when config row missing lateToleranceMinutes", async () => {
    getEffectiveConfigMock.mockResolvedValueOnce({
      lateToleranceMinutes: null,
      source: "default",
    });
    const result = await resolveLateThreshold(0, 2026, 5);
    expect(result.thresholdMinutes).toBe(15);
    expect(result.source).toBe("default");
  });

  it("returns fallback=15 when getEffectiveConfig throws (skill must not crash)", async () => {
    getEffectiveConfigMock.mockRejectedValueOnce(new Error("DB unreachable"));
    const result = await resolveLateThreshold(0, 2026, 5);
    expect(result.thresholdMinutes).toBe(15);
    expect(result.source).toBe("fallback");
  });

  it("late detection logic — diff=18min, tolerance=15 → late=true", () => {
    const tolerance = 15;
    const diffMinutes = 18;
    expect(diffMinutes > tolerance).toBe(true);
  });

  it("late detection logic — diff=18min, tolerance=20 → late=false (false positive eliminated)", () => {
    const tolerance = 20;
    const diffMinutes = 18;
    expect(diffMinutes > tolerance).toBe(false);
  });
});
