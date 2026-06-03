/** Length unit-of-measure conversion. The dimension preview scales width/height/depth against each
 *  other, so they must be normalized to a common base first — otherwise 10 in renders the same size
 *  as 10 cm. Factors convert a unit to MILLIMETRES (exact physical constants; never drift).
 *  Keyed by Moqui uomId (moqui.basic.Uom, UT_LENGTH_MEASURE). */
const LENGTH_TO_MM: Record<string, number> = {
  LEN_mm: 1,
  LEN_cm: 10,
  LEN_dm: 100,
  LEN_m: 1000,
  LEN_dam: 10_000,
  LEN_hm: 100_000,
  LEN_km: 1_000_000,
  LEN_in: 25.4,
  LEN_ft: 304.8,
  LEN_yd: 914.4,
  LEN_mi: 1_609_344,
  LEN_hand: 101.6
}

/** Factor to convert a length value in `uomId` to millimetres. Unknown/blank units fall back to 1
 *  (treated as the base), which leaves same-unit or unitless products scaling exactly as before. */
export function lengthUomToMm(uomId: string): number {
  return LENGTH_TO_MM[uomId] ?? 1
}
