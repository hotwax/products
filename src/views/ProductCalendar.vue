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
            <p class="overline">
              {{ calendarProductStoreId }}
            </p>
            <h1>{{ translate("Product calendar") }}</h1>
            <p class="muted">
              {{ translate("ProductStore-scoped lifecycle dates used by ATP rules.") }}
            </p>
          </div>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Shopify metafield mappings") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Manage lifecycle date metafield mappings in Company Product Sync.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ activeCalendarMappings.length }} {{ translate("active calendar mappings") }}</ion-label>
            <ion-button v-if="mappingManagementHref" slot="end" fill="clear" :href="mappingManagementHref" target="_blank" rel="noopener noreferrer">
              {{ translate("Manage Shopify mappings") }}
              <ion-icon slot="end" :icon="openOutline" />
            </ion-button>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Calendar dates") }}</ion-card-title>
            <ion-card-subtitle>{{ totalCount }} {{ translate("products") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-item lines="none">
            <ion-searchbar v-model="search" :placeholder="translate('Search by product ID, product name, or internal name')" />
          </ion-item>
          <ion-list v-if="rows.length">
            <ion-item v-for="row in rows" :key="`${row.productStoreId}:${row.productId}`">
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
          <ion-card-content v-else class="muted">
            {{ loading ? translate("Loading…") : translate("No calendar rows match the current search.") }}
          </ion-card-content>
          <ion-infinite-scroll :disabled="!hasNextPage" @ion-infinite="loadMore">
            <ion-infinite-scroll-content loading-spinner="crescent" />
          </ion-infinite-scroll>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList,
  IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar
} from "@ionic/vue"
import { useInfiniteQuery } from "@tanstack/vue-query"
import { openOutline, refreshOutline } from "ionicons/icons"
import { DateTime } from "luxon"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { fetchProductCalendarMappings, fetchProductStoreShops } from "@/api/productCalendar"
import EmptyState from "@/components/EmptyState.vue"
import { productCalendarOptions } from "@/queries/productCalendar"
import { useUserStore } from "@/store/user"
import { showToast } from "@/utils"
import { getActiveCalendarMappings, getCalendarMappingManagementHref } from "@/utils/productCalendarMappings"

const route = useRoute()
const userStore = useUserStore()
const shops = ref<Record<string, any>[]>([])
const mappings = ref<Record<string, any>[]>([])
const search = ref("")

const calendarProductStoreId = computed(() => {
  const requestedProductStoreId = route.query.productStoreId
  if(typeof requestedProductStoreId === "string" && requestedProductStoreId) {return requestedProductStoreId}

  return userStore.getCurrentProductStore?.productStoreId || ""
})
const activeCalendarMappings = computed(() => getActiveCalendarMappings(shops.value, mappings.value))
const mappingManagementHref = computed(() => getCalendarMappingManagementHref(shops.value))
const calendarQuery = useInfiniteQuery(computed(() => productCalendarOptions(calendarProductStoreId.value, search.value)))
const rows = computed(() => calendarQuery.data.value?.pages.flatMap((page) => page.calendarRows) ?? [])
const totalCount = computed(() => calendarQuery.data.value?.pages[0]?.totalCount ?? 0)
const loading = computed(() => calendarQuery.isLoading.value || calendarQuery.isFetching.value)
const hasNextPage = calendarQuery.hasNextPage

function parseDate(value: unknown) {
  if(!value) {return null}
  if(typeof value === "number" || (!isNaN(Number(value)) && !String(value).includes("-") && !String(value).includes(":"))) {
    const millis = DateTime.fromMillis(Number(value));
    if(millis.isValid) {return millis;}
  }
  const iso = DateTime.fromISO(String(value));
  if(iso.isValid) {return iso;}
  const sql = DateTime.fromSQL(String(value));
  if(sql.isValid) {return sql;}

  return null;
}

function formatDate(value: unknown) {
  const dt = parseDate(value);

  return dt && dt.isValid ? dt.toLocaleString(DateTime.DATETIME_MED) : "-";
}

async function loadReferences(productStoreId: string) {
  const [productStoreShops, calendarMappings] = await Promise.all([
    fetchProductStoreShops(productStoreId),
    fetchProductCalendarMappings()
  ])
  shops.value = productStoreShops
  mappings.value = calendarMappings
}

async function refresh() {
  const productStoreId = calendarProductStoreId.value
  if(!productStoreId) {
    shops.value = []
    mappings.value = []

    return
  }

  try {
    await Promise.all([calendarQuery.refetch(), loadReferences(productStoreId)])
  } catch {
    shops.value = []
    mappings.value = []
    await showToast(translate("Unable to load product calendar."))
  }
}

watch(calendarProductStoreId, (productStoreId) => {
  if(productStoreId) {loadReferences(productStoreId)} else {
    shops.value = []
    mappings.value = []
  }
}, { immediate: true })

async function loadMore(event: CustomEvent) {
  try {
    if(calendarQuery.hasNextPage.value && !calendarQuery.isFetchingNextPage.value) {
      await calendarQuery.fetchNextPage()
    }
  } finally {
    (event.target as any)?.complete()
  }
}
</script>

<style scoped>
main {
  padding: var(--spacer-base);
}

.page-heading {
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
  .date-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
