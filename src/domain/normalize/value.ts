/** Tiny pure coercion helpers shared by all normalizers. Backend values arrive as strings,
 *  numbers, epoch millis, or Y/N indicators depending on the source — normalize once, here. */

export function textValue(value: unknown): string {
  if(value == null) {return ""}
  const text = String(value).trim()

  return text
}

export function numberValue(value: unknown): number | null {
  if(value == null || value === "") {return null}
  const num = Number(value)

  return Number.isFinite(num) ? num : null
}

export function flagValue(value: unknown): boolean {
  if(typeof value === "boolean") {return value}
  const text = textValue(value).toUpperCase()

  return text === "Y" || text === "TRUE"
}

/** Moqui timestamps arrive as epoch millis (numbers) in REST JSON, ISO strings from Solr. → ISO string. */
export function isoDate(value: unknown): string | null {
  if(value == null || value === "") {return null}
  if(typeof value === "number") {return new Date(value).toISOString()}
  const text = String(value).trim()
  if(!text) {return null}
  const asNumber = Number(text)
  if(Number.isFinite(asNumber) && text.length >= 12) {return new Date(asNumber).toISOString()}
  const parsed = new Date(text.includes(" ") ? text.replace(" ", "T") : text)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function stringArray(value: unknown): string[] {
  if(value == null) {return []}
  if(Array.isArray(value)) {return value.map((entry) => textValue(entry)).filter(Boolean)}
  const text = textValue(value)

  return text ? [text] : []
}

/** active = fromDate in the past (or unset) and thruDate unset or in the future */
export function isActive(fromDate: string | null, thruDate: string | null, now = Date.now()): boolean {
  if(fromDate && new Date(fromDate).getTime() > now) {return false}
  if(thruDate && new Date(thruDate).getTime() <= now) {return false}

  return true
}
