import { createConsultation, uploadPhoto } from './api'
import { draft } from './state'

export async function submitDraft(adultConfirmed: boolean, isActive: () => boolean) {
  // Keep the workflow and its inputs together even if the user starts another consultation.
  const snapshot = { ...draft }
  const current = () => isActive() && draft.sessionId === snapshot.sessionId
    && draft.module === snapshot.module && draft.localPhoto === snapshot.localPhoto
    && draft.localGarment === snapshot.localGarment
  if (!adultConfirmed || !snapshot.localPhoto || (snapshot.module === 'tryon' && !snapshot.localGarment) || !current())
    return

  const [person, garment] = await Promise.all([
    snapshot.photoURL ? Promise.resolve({ url: snapshot.photoURL }) : uploadPhoto(snapshot.localPhoto),
    snapshot.module === 'tryon'
      ? snapshot.garmentURL ? Promise.resolve({ url: snapshot.garmentURL }) : uploadPhoto(snapshot.localGarment)
      : Promise.resolve({ url: '' }),
  ])
  if (!current()) return
  draft.photoURL = person.url
  draft.garmentURL = garment.url
  const consultation = await createConsultation({
    module: snapshot.module,
    photo_url: person.url,
    ...(snapshot.module === 'tryon' ? { garment_url: garment.url } : {}),
    presentation: snapshot.presentation,
    preferences: snapshot.preferences,
    include_beauty: snapshot.module === 'hair' && snapshot.includeBeauty,
    adult_confirmed: adultConfirmed,
  })
  if (!current()) return
  draft.consultationId = consultation.id
  return consultation
}
