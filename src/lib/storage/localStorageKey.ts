export function createLocalStorageKey<T extends string>(key: string, allowedValues: readonly T[]) {
  return {
    get(fallback: T): T {
      const raw = window.localStorage.getItem(key)
      return raw !== null && (allowedValues as readonly string[]).includes(raw)
        ? (raw as T)
        : fallback
    },
    set(value: T): void {
      window.localStorage.setItem(key, value)
    },
  }
}
