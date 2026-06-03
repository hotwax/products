import { describe, expect, it } from "vitest"
import { lengthUomToMm } from "../uom"

describe("lengthUomToMm", () => {
  it("converts known length units to millimetres (exact constants)", () => {
    expect(lengthUomToMm("LEN_mm")).toBe(1)
    expect(lengthUomToMm("LEN_cm")).toBe(10)
    expect(lengthUomToMm("LEN_m")).toBe(1000)
    expect(lengthUomToMm("LEN_in")).toBe(25.4)
    expect(lengthUomToMm("LEN_ft")).toBe(304.8)
  })

  it("makes 1 inch ~2.54x a centimetre so mixed-unit axes scale truthfully", () => {
    expect(lengthUomToMm("LEN_in") / lengthUomToMm("LEN_cm")).toBeCloseTo(2.54, 5)
  })

  it("falls back to 1 for unknown or blank units (same-unit/unitless behaviour)", () => {
    expect(lengthUomToMm("")).toBe(1)
    expect(lengthUomToMm("LEN_unknown")).toBe(1)
  })
})
