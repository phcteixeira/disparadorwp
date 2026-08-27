import { describe, expect, it } from "vitest";
import { utcToZonedInputValue, zonedTimeToUtc } from "./timezone";

describe("zonedTimeToUtc", () => {
  it("converte um horário de São Paulo (UTC-3, sem horário de verão) para UTC", () => {
    const utc = zonedTimeToUtc("2026-09-01T14:30", "America/Sao_Paulo");
    expect(utc.toISOString()).toBe("2026-09-01T17:30:00.000Z");
  });

  it("é o inverso de utcToZonedInputValue", () => {
    const original = "2026-12-25T09:15";
    const utc = zonedTimeToUtc(original, "America/Sao_Paulo");
    expect(utcToZonedInputValue(utc, "America/Sao_Paulo")).toBe(original);
  });
});
