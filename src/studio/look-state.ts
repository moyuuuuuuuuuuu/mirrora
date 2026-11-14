import type { Material, Mode } from './catalog'
export type LookItem = { id:string; name:string; prompt:string; asset_url?:string }
export type LookSlot = { items:LookItem[]; tone:string; refinements:string[] }
export type LookState = { version:1; slots:Record<string,LookSlot> }
export type StudioContext = { base_id:string; look:LookState; edit_region?:[number,number][]; edit_scope?:'upper' }
export const emptyLook = ():LookState => ({version:1,slots:{}})
export const cloneLook = (look:LookState):LookState => JSON.parse(JSON.stringify(look))
export function updateLook(previous:LookState,mode:Mode,materials:Material[],tone:string,note:string):LookState {
  const look=cloneLook(previous), slot=mode==='outfit'?'tryon':mode
  if(!['tryon','hair','makeup','accessories'].includes(slot))return look
  const items=materials.map(x=>({id:x.id,name:x.name,prompt:x.prompt,...(x.local?{asset_url:x.image}:{})}))
  const before=look.slots[slot]
  const same=before && JSON.stringify(before.items.map(x=>x.id))===JSON.stringify(items.map(x=>x.id)) && before.tone===tone
  const refinements=same?[...before.refinements]:[]
  if(note.trim() && refinements[refinements.length-1]!==note.trim())refinements.push(note.trim())
  look.slots[slot]={items,tone,refinements:refinements.slice(-20)}
  return look
}
export function lookSelections(look:LookState):Record<string,string[]> {
  const result:Record<string,string[]>={tryon:[],hair:[],makeup:[],accessories:[],'tryon-tone':[],'hair-tone':[],'makeup-tone':[],'accessories-tone':[]}
  for(const [name,slot] of Object.entries(look.slots)){result[name]=slot.items.map(x=>x.id);result[`${name}-tone`]=slot.tone?[slot.tone]:[]}
  return result
}
export function lookUploads(look:LookState):Material[] {
  return (look.slots.tryon?.items||[]).filter(x=>x.asset_url).map(x=>({id:x.id,name:x.name,prompt:x.prompt,image:x.asset_url!,category:'我的上传',local:true}))
}
