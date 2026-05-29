export interface OmsProductAssocTypeRow {
  productAssocTypeId: string
  parentTypeId: string
  description: string
  parentDescription: string
}

export interface ProductAssocTypeMeta {
  typeId: string
  label: string
  shortLabel: string
  description: string
  fromVerb: string
  toVerb: string
  parentTypeId: string
  parentDescription: string
  supportsBom: boolean
}

export function buildAssocTypeMeta(omsRow: OmsProductAssocTypeRow): ProductAssocTypeMeta {
  const label = omsRow.description || omsRow.productAssocTypeId

  return {
    typeId: omsRow.productAssocTypeId,
    label,
    shortLabel: label,
    description: omsRow.description || omsRow.productAssocTypeId,
    fromVerb: label,
    toVerb: label,
    parentTypeId: omsRow.parentTypeId,
    parentDescription: omsRow.parentDescription,
    supportsBom: omsRow.parentTypeId === "PRODUCT_COMPONENT" || omsRow.productAssocTypeId === "PRODUCT_COMPONENT"
  }
}

export function buildAssocTypeCatalog(omsRows: OmsProductAssocTypeRow[]): ProductAssocTypeMeta[] {
  return omsRows
    .filter((row) => row.productAssocTypeId)
    .map(buildAssocTypeMeta)
}
