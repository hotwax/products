import type { ImportHistoryEntry, ProductHistoryEntry } from "../types/product"
import { isoDate, textValue } from "./value"

type Raw = Record<string, unknown>

/** admin/entityAuditLogs row → ProductHistoryEntry (field-level audit trail on the detail page). */
export function normalizeAuditEntry(record: Raw): ProductHistoryEntry {
  return {
    id: textValue(record.auditHistorySeqId ?? record.entityAuditLogId ?? `${record.changedEntityName}-${record.changedDate}`),
    productId: textValue(record.pkPrimaryValue ?? record.productId),
    changedEntityName: textValue(record.changedEntityName),
    changedFieldName: textValue(record.changedFieldName),
    oldValue: textValue(record.oldValueText ?? record.oldValue),
    newValue: textValue(record.newValueText ?? record.newValue),
    changedByUserId: textValue(record.changedByUserId ?? record.changedByUser),
    changedDate: isoDate(record.changedDate) ?? ""
  }
}

/** oms/products/productUpdateHistories row → ImportHistoryEntry (imports page). */
export function normalizeImportEntry(record: Raw): ImportHistoryEntry {
  return {
    id: textValue(record.productUpdateHistoryId ?? `${record.productId}-${record.createdDate}`),
    productId: textValue(record.productId),
    shopId: textValue(record.shopId),
    parentProductId: textValue(record.parentProductId),
    sku: textValue(record.sku ?? record.shopifyProductSku),
    status: textValue(record.status ?? record.statusId) || "Recorded",
    message: textValue(record.message ?? record.comments ?? record.description),
    createdDate: isoDate(record.createdDate ?? record.lastUpdatedStamp) ?? ""
  }
}
