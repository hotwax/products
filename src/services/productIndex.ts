import type { ProductSearchParams, ProductSearchResult, ProductSummary } from "@/types/product"

const DB_NAME = "hotwax-products"
const DB_VERSION = 1
const PRODUCT_STORE = "products"
const META_STORE = "metadata"
const SYNC_META_KEY = "products"

export interface ProductIndexMetadata {
  key: string
  count: number
  syncedAt: string
}

export function searchIndexedProducts(
  products: ProductSummary[],
  params: ProductSearchParams = {}
): ProductSearchResult {
  const pageSize = Number(params.pageSize ?? 25)
  const pageIndex = Number(params.pageIndex ?? 0)
  const queryString = params.queryString?.trim().toLowerCase() ?? ""
  const productTypeId = params.productTypeId ?? "FINISHED_GOOD"
  const productKind = params.productKind ?? "All"
  const productStoreId = params.productStoreId ?? ""
  const start = pageIndex * pageSize
  const filteredProducts = products.filter((product) => {
    if(productTypeId && productTypeId !== "All" && product.productTypeId !== productTypeId) {
      return false
    }

    if(productStoreId && productStoreId !== "All" && product.productStoreIds.length && !product.productStoreIds.includes(productStoreId)) {
      return false
    }

    if(productKind === "Variants" && !product.isVariant) {
      return false
    }

    if(productKind === "Virtuals" && !product.isVirtual) {
      return false
    }

    if(!queryString) {
      return true
    }

    return [
      product.productId,
      product.productName,
      product.internalName,
      product.primarySku,
      product.brandName,
      product.primaryProductCategoryId,
      product.searchText
    ].some((value) => value.toLowerCase().includes(queryString))
  })

  return {
    products: filteredProducts.slice(start, start + pageSize),
    total: filteredProducts.length,
    pageIndex,
    pageSize
  }
}

export async function readIndexedProducts(): Promise<ProductSummary[]> {
  const db = await openProductIndex()

  return requestToPromise(db.transaction(PRODUCT_STORE, "readonly").objectStore(PRODUCT_STORE).getAll()) as Promise<ProductSummary[]>
}

export async function replaceIndexedProducts(products: ProductSummary[]): Promise<ProductIndexMetadata> {
  const db = await openProductIndex()
  const metadata: ProductIndexMetadata = {
    key: SYNC_META_KEY,
    count: products.length,
    syncedAt: new Date().toISOString()
  }

  await transactionToPromise(db, [PRODUCT_STORE, META_STORE], "readwrite", (transaction) => {
    const productStore = transaction.objectStore(PRODUCT_STORE)
    productStore.clear()
    products.forEach((product) => productStore.put(product))
    transaction.objectStore(META_STORE).put(metadata)
  })

  return metadata
}

export async function getProductIndexMetadata(): Promise<ProductIndexMetadata | null> {
  const db = await openProductIndex()
  const metadata = await requestToPromise(db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(SYNC_META_KEY))

  return metadata ? metadata as ProductIndexMetadata : null
}

function openProductIndex(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if(!db.objectStoreNames.contains(PRODUCT_STORE)) {
        db.createObjectStore(PRODUCT_STORE, { keyPath: "productId" })
      }
      if(!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionToPromise(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    callback(transaction)
  })
}

function requestToPromise(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
