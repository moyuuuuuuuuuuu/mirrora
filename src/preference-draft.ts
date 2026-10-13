export type PreferenceDraft = { selected: string[]; effort: string; note: string; beauty: boolean }
function key(module: string) { return `mirror_preferences:${uni.getStorageSync('mirror_token') || 'guest'}:${module}` }
export function readPreferenceDraft(module: string): PreferenceDraft | undefined {
  try {
    const value = uni.getStorageSync(key(module))
    if (value && Array.isArray(value.selected) && value.selected.every((x: unknown) => typeof x === 'string') && typeof value.effort === 'string' && typeof value.note === 'string' && typeof value.beauty === 'boolean') return value
  } catch {}
}
export function savePreferenceDraft(module: string, value: PreferenceDraft) {
  try { uni.setStorageSync(key(module), { ...value, selected: [...value.selected] }) } catch {}
}
export function clearPreferenceDraft(module: string) { try { uni.removeStorageSync(key(module)) } catch {} }
