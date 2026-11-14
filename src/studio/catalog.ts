import { asset, studioImages } from './assets'

export type Mode = 'tryon' | 'hair' | 'makeup' | 'accessories' | 'outfit' | 'skin'
export type Material = { id: string; name: string; category: string; image: string; prompt: string; local?: boolean; icon?: string }
export const modes: { id: Mode; name: string; en: string }[] = [
  { id: 'tryon', name: '试衣', en: 'WARDROBE' }, { id: 'hair', name: '发型', en: 'HAIR STUDIO' },
  { id: 'makeup', name: '妆容', en: 'MAKEUP' }, { id: 'accessories', name: '配饰', en: 'ACCESSORIES' },
]
export const modeNames: Record<Mode, string> = { tryon: '试衣', hair: '发型', makeup: '妆容', accessories: '配饰', outfit: '穿搭建议', skin: '肤质护理' }
export const tones: Partial<Record<Mode, {name:string;color:string}[]>> = {
  hair: [{name:'自然黑',color:'#302a26'},{name:'深棕',color:'#554033'},{name:'茶棕',color:'#8d6747'},{name:'亚麻棕',color:'#b29a75'}],
  makeup: [{name:'裸杏米',color:'#be9382'},{name:'豆沙玫瑰',color:'#ae7370'},{name:'枫叶棕',color:'#945e49'},{name:'砖红色',color:'#873d35'}],
}
function styles(prefix: string, names: string[], categories: string[], ext = 'webp'): Material[] {
  return names.map((name, i) => ({ id: `${prefix}-${i}`, name, category: categories[i], image: asset(`design/${prefix}-style-${i + 1}.${ext}`), prompt: name }))
}
export const catalog: Record<Mode, Material[]> = {
  tryon: [
    { id: 'ivory', name: '松弛通勤', category: '通勤', image: studioImages.person, prompt: '米白西装与深灰阔腿裤' },
    { id: 'weekend', name: '燕麦周末', category: '日常', image: studioImages.weekend, prompt: '燕麦针织与米白长裤' },
    ...styles('outfit', ['简约日常', '利落通勤', '轻盈约会', '个性层次'], ['日常', '通勤', '约会', '日常']),
  ],
  hair: styles('hair', ['自然微卷', '利落短发', '轻盈层次', '柔顺长发'], ['卷发', '短发', '中长发', '长发'], 'png'),
  makeup: styles('makeup', ['清透日常', '温柔玫瑰', '精致通勤', '晚间微醺'], ['日常', '约会', '通勤', '约会']),
  accessories: [
    { id: 'earring', name: '极简金圈', category: '耳饰', image: '', icon: 'earring', prompt: '小巧的金色圈形耳饰' },
    { id: 'necklace', name: '细链吊坠', category: '项链', image: '', icon: 'necklace', prompt: '精致金色细链吊坠' },
    { id: 'bag', name: '巧克力手袋', category: '包袋', image: '', icon: 'bag', prompt: '小巧的深棕色手袋' },
    { id: 'watch', name: '复古腕表', category: '腕表', image: '', icon: 'watch', prompt: '棕色皮带腕表' },
  ],
  outfit: styles('outfit', ['简约日常', '利落通勤', '轻盈约会', '个性层次'], ['日常', '通勤', '约会', '日常']),
  skin: styles('skin', ['基础护理', '温和保湿', '清爽日常', '自然光泽'], ['日常', '日常', '日常', '日常']),
}
export const placeholders: Record<Mode, string> = {
  tryon: '例如：外套宽松一点，裤脚短一点…', hair: '例如：刘海轻薄一点，保留现在的长度…',
  makeup: '例如：唇色淡一点，眼妆更自然…', accessories: '例如：换成小一点的金色耳环…',
  outfit: '例如：适合通勤，偏好简约的中性色…', skin: '例如：想了解日常保湿与护理方向…',
}
