type Raw = Record<string, unknown>

function docKey(doc: Raw, index: number): string {
  const productId = doc.productId ?? doc.id

  return productId ? String(productId) : `__doc_${index}`
}

function docVersion(doc: Raw): number {
  const version = Number(doc._version_ ?? 0)

  return Number.isFinite(version) ? version : 0
}

export function latestProductDocs(docs: Raw[]): Raw[] {
  const latest = new Map<string, Raw>()

  docs.forEach((doc, index) => {
    const key = docKey(doc, index)
    const existing = latest.get(key)
    if(!existing || docVersion(doc) >= docVersion(existing)) {
      latest.set(key, doc)
    }
  })

  return [...latest.values()]
}
