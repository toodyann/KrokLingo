const PREFIX = 'kroklingo:v1:'

export const STORAGE_KEYS = {
  dictionary: 'dictionary',
  history: 'history',
  session: 'session',
  settings: 'settings',
  customBank: 'customBank',
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(PREFIX + key)
    } else {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    }
    return true
  } catch {
    return false
  }
}

export function clearAll(): void {
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(PREFIX + key)
    }
  } catch {
    // storage unavailable — nothing to clear
  }
}
