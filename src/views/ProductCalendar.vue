<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product calendar") }}</ion-title>
        <ion-button slot="end" fill="clear" :disabled="loading" @click="refresh">
          <ion-icon slot="icon-only" :icon="refreshOutline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="!calendarProductStoreId" class="empty-page">
        <EmptyState
          :title="translate('No product store selected')"
          :message="translate('Choose a product store to manage product calendar dates.')"
        />
      </main>

      <main v-else>
        <div class="page-heading">
          <div>
            <p class="overline">{{ calendarProductStoreId }}</p>
            <h1>{{ translate("Product calendar") }}</h1>
            <p class="muted">{{ translate("ProductStore-scoped lifecycle dates used by ATP rules.") }}</p>
          </div>
          <ion-button @click="showMapping = true">{{ translate("Add Shopify mapping") }}</ion-button>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Shopify metafield mappings") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Each mapping writes one Shopify metafield into a calendar date column for that shop’s ProductStore.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list v-if="visibleMappings.length">
            <ion-item v-for="mapping in visibleMappings" :key="`${mapping.shopId}:${mapping.mappedKey}`">
              <ion-label>
                <h2>{{ shopName(String(mapping.shopId ?? "")) }}</h2>
                <p>{{ mapping.shopId }}</p>
              </ion-label>
              <ion-note slot="end">{{ mapping.mappedKey }} ← {{ mapping.mappedValue }}</ion-note>
            </ion-item>
          </ion-list>
          <ion-card-content v-else class="muted">{{ translate("No calendar metafield mappings configured for this ProductStore.") }}</ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Calendar dates") }}</ion-card-title>
            <ion-card-subtitle>{{ rows.length }} {{ translate("products") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-item lines="none">
            <ion-searchbar v-model="search" :placeholder="translate('Search by product name or ID')" />
          </ion-item>
          <ion-list v-if="filteredRows.length">
            <ion-item v-for="row in filteredRows" :key="`${row.productStoreId}:${row.productId}`">
              <ion-label>
                <h2>{{ row.productName || row.internalName || row.productId }}</h2>
                <p>{{ row.productId }}</p>
              </ion-label>
              <div class="date-grid">
                <span><strong>{{ translate("Introduction") }}</strong>{{ formatDate(row.introductionDate) }}</span>
                <span><strong>{{ translate("Launch") }}</strong>{{ formatDate(row.releaseDate) }}</span>
                <span><strong>{{ translate("Support ends") }}</strong>{{ formatDate(row.supportDiscontinuationDate) }}</span>
                <span><strong>{{ translate("Sales ends") }}</strong>{{ formatDate(row.salesDiscontinuationDate) }}</span>
              </div>
            </ion-item>
          </ion-list>
          <ion-card-content v-else class="muted">{{ loading ? translate("Loading…") : translate("No calendar rows match the current search.") }}</ion-card-content>
        </ion-card>

        <ion-modal :is-open="showMapping" @did-dismiss="showMapping = false">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button fill="clear" @click="showMapping = false">
                  <ion-icon slot="icon-only" :icon="closeOutline" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Add Shopify calendar mapping") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <ion-list>
              <ion-item>
                <ion-select v-model="newMapping.shopId" :label="translate('Shop')" label-placement="stacked">
                  <ion-select-option v-for="shop in shops" :key="String(shop.shopId)" :value="String(shop.shopId)">
                    {{ shop.name || shop.shopId }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select v-model="newMapping.mappedKey" :label="translate('Calendar date column')" label-placement="stacked">
                  <ion-select-option v-for="field in PRODUCT_CALENDAR_DATE_FIELDS" :key="field" :value="field">
                    {{ field }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-input v-model="newMapping.mappedValue" :label="translate('Metafield selector')" :placeholder="translate('namespace:key or definition ID')" label-placement="stacked" />
              </ion-item>
            </ion-list>
            <ion-button expand="block" :disabled="!newMapping.shopId || !newMapping.mappedKey || !newMapping.mappedValue || saving" @click="saveMapping">
              {{ saving ? translate("Saving…") : translate("Save mapping") }}
            </ion-button>
          </ion-content>
        </ion-modal>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton, IonModal,
  IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar
} from "@ionic/vue"
import { closeOutline, refreshOutline } from "ionicons/icons"
import { DateTime } from "luxon"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { translate } from "@common"
import EmptyState from "@/components/EmptyState.vue"
import {
  fetchProductCalendar,
  fetchProductCalendarMappings,
  fetchProductStoreShops,
  PRODUCT_CALENDAR_DATE_FIELDS,
  saveProductCalendarMapping
} from "@/api/productCalendar"
import { useUserStore } from "@/store/user"
import { showToast } from "@/utils"

const route = useRoute()
const userStore = useUserStore()
const rows = ref<Record<string, any>[]>([])
const shops = ref<Record<string, any>[]>([])
const mappings = ref<Record<string, any>[]>([])
const search = ref("")
const loading = ref(false)
const saving = ref(false)
const showMapping = ref(false)
const newMapping = ref({ shopId: "", mappedKey: "releaseDate", mappedValue: "" })

const calendarProductStoreId = computed(() => {
  const requestedProductStoreId = route.query.productStoreId
  if(typeof requestedProductStoreId === "string" && requestedProductStoreId) {return requestedProductStoreId}

  return userStore.getCurrentProductStore?.productStoreId || ""
})
const visibleMappings = computed(() => {
  const shopIds = new Set(shops.value.map((shop) => String(shop.shopId ?? "")))

  return mappings.value.filter((mapping) => shopIds.has(String(mapping.shopId ?? "")))
})
const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

  return rows.value.filter((row) => !query || `${row.productId || ""} ${row.productName || ""} ${row.internalName || ""}`.toLowerCase().includes(query))
})

function parseDate(value: unknown) {
  if(!value) {return null}

  const iso = DateTime.fromISO(String(value))
  return iso.isValid ? iso : DateTime.fromSQL(String(value))
}

function formatDate(value: unknown) {
  return parseDate(value)?.toLocaleString(DateTime.DATETIME_MED) || "-"
}

function shopName(shopId: string) {
  return shops.value.find((shop) => String(shop.shopId) === shopId)?.name || shopId
}

async function refresh() {
  const productStoreId = calendarProductStoreId.value
  if(!productStoreId) {
    rows.value = []
    shops.value = []
    mappings.value = []
    return
  }

  loading.value = true
  try {
    const [calendarRows, productStoreShops, calendarMappings] = await Promise.all([
      fetchProductCalendar(productStoreId),
      fetchProductStoreShops(productStoreId),
      fetchProductCalendarMappings()
    ])
    rows.value = calendarRows
    shops.value = productStoreShops
    mappings.value = calendarMappings
  } catch {
    rows.value = []
    shops.value = []
    mappings.value = []
    await showToast(translate("Unable to load product calendar."))
  } finally {
    loading.value = false
  }
}

async function saveMapping() {
  const shop = shops.value.find((candidate) => String(candidate.shopId) === newMapping.value.shopId)
  if(!shop) {return}

  saving.value = true
  try {
    await saveProductCalendarMapping(newMapping.value)
    showMapping.value = false
    newMapping.value = { shopId: "", mappedKey: "releaseDate", mappedValue: "" }
    await refresh()
    await showToast(translate("Shopify calendar mapping saved."))
  } catch {
    await showToast(translate("Unable to save calendar mapping."))
  } finally {
    saving.value = false
  }
}

watch(calendarProductStoreId, refresh, { immediate: true })
</script>

<style scoped>
main {
  padding: var(--spacer-base);
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacer-base);
  margin-block-end: var(--spacer-base);
}

.page-heading h1 {
  margin: 0;
}

.muted {
  color: var(--ion-color-medium);
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacer-xs);
}

.date-grid span {
  display: flex;
  flex-direction: column;
  color: var(--ion-color-medium);
}

.date-grid strong {
  color: var(--ion-color-dark);
}

.empty-page {
  height: 100%;
  display: grid;
  place-items: center;
}

@media (max-width: 800px) {
  .page-heading {
    flex-direction: column;
  }

  .date-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
