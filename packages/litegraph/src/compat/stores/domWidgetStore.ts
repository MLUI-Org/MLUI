class DomWidgetStoreCompat {
  clearPositionOverride(_: string) {}
}

const domWidgetStore = new DomWidgetStoreCompat()

export function useDomWidgetStore() {
  return domWidgetStore
}
