/** Public editorial assets only. User photos keep their signed API URLs. */
export function asset(path: string) {
  const base = import.meta.env.PROD ? (import.meta.env.VITE_ASSET_BASE_URL || '').trim().replace(/\/+$/, '') : ''
  return `${base}/static/${path.replace(/^\/+/, '')}`
}

export const studioImages = {
  room: asset('studio/room.webp'),
  person: asset('studio/person.webp'),
  weekend: asset('studio/person-weekend.webp'),
}
