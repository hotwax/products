export interface ProductIdentifierPreference {
  primaryId?: string
  secondaryId?: string
}

export const DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE: Required<ProductIdentifierPreference> = {
  primaryId: "SKU",
  secondaryId: "productId"
}

type ProductLike = Record<string, unknown>

const identifierAliases: Record<string, string[]> = {
  SKU: ["sku"],
  UPC: ["upc"],
  productId: ["productId", "id"],
  internalName: ["internalName"],
  parentProductName: ["parentProductName"],
  productName: ["productName"],
  title: ["title"]
}

function textValue(value: unknown): string {
  return value == null ? "" : String(value).trim()
}

function normalizedPreference(preference?: ProductIdentifierPreference): Required<ProductIdentifierPreference> {
  return {
    primaryId: textValue(preference?.primaryId) || DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE.primaryId,
    secondaryId: textValue(preference?.secondaryId) || DEFAULT_PRODUCT_IDENTIFIER_PREFERENCE.secondaryId
  }
}

function identificationValue(identifier: string, product: ProductLike): string {
  const aliases = [identifier, ...(identifierAliases[identifier] || [])]
  const directValue = aliases.map((key) => textValue(product[key])).find(Boolean)
  if(directValue) {return directValue}

  const goodIdentifications = product.goodIdentifications
  if(!Array.isArray(goodIdentifications)) {return ""}

  const identification = goodIdentifications.find((entry) => {
    if(typeof entry === "string") {
      return aliases.some((alias) => entry.startsWith(`${alias}/`))
    }

    if(!entry || typeof entry !== "object") {return false}

    const record = entry as ProductLike
    const type = textValue(record.type || record.goodIdentificationTypeId || record.idType || record.identKey)

    return aliases.includes(type)
  })

  if(typeof identification === "string") {
    return textValue(identification.substring(identification.indexOf("/") + 1))
  }

  if(identification && typeof identification === "object") {
    const record = identification as ProductLike

    return textValue(record.value || record.idValue || record.identValue || record.goodIdentificationValue)
  }

  return ""
}

function usableInternalName(value: unknown, productId: unknown): string {
  const internalName = textValue(value)
  if(!internalName || internalName === textValue(productId) || /^\d{10,}$/.test(internalName)) {return ""}

  return internalName
}

export function getPrimaryProductIdentifier(preference: ProductIdentifierPreference | undefined, product: ProductLike): string {
  const normalized = normalizedPreference(preference)

  return identificationValue(normalized.primaryId, product) ||
    usableInternalName(product.internalName, product.productId) ||
    textValue(product.productName) ||
    textValue(product.parentProductName) ||
    textValue(product.title) ||
    textValue(product.productId)
}

export function getSecondaryProductIdentifier(preference: ProductIdentifierPreference | undefined, product: ProductLike): string {
  const normalized = normalizedPreference(preference)

  return identificationValue(normalized.secondaryId, product) ||
    textValue(product.productId)
}
