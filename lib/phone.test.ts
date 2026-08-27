import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("adiciona DDI 55 a um número com DDD (11 dígitos)", () => {
    expect(normalizePhone("(11) 98888-7777")).toBe("5511988887777");
  });

  it("adiciona DDI 55 a um número com DDD (10 dígitos, fixo)", () => {
    expect(normalizePhone("11 3888-7777")).toBe("551138887777");
  });

  it("mantém um número que já tem DDI 55", () => {
    expect(normalizePhone("+55 11 98888-7777")).toBe("5511988887777");
  });

  it("retorna null para entrada vazia ou inválida", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
});
