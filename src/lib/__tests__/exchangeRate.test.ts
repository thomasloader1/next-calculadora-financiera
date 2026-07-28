import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOfficialRate } from "../exchangeRate";

const mockRate = {
  compra: 1000,
  venta: 1050,
  casa: "Oficial",
  nombre: "Dólar Oficial",
  moneda: "USD",
  fechaActualizacion: "27/07/2026",
};

describe("getOfficialRate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a DollarRate with numeric compra and venta", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockRate,
    } as Response);

    const rate = await getOfficialRate();

    expect(rate.compra).toBeTypeOf("number");
    expect(rate.venta).toBeTypeOf("number");
    expect(rate.nombre).toBe("Dólar Oficial");
  });

  it("throws when fetch fails and no cache exists", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await expect(getOfficialRate()).rejects.toThrow("network");
  });
});
