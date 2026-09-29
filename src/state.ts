import { reactive } from 'vue'
export const draft=reactive({module:'hair',presentation:'不限定',preferences:'',includeBeauty:false,photoURL:'',localPhoto:'',garmentURL:'',localGarment:'',consultationId:''})
export const modules={hair:{name:'发型与发色',en:'HAIR & COLOR',desc:'结合脸型、比例与日常习惯'},skin:{name:'皮肤状态',en:'SKIN',desc:'非医疗的肤质观察与护理方向'},outfit:{name:'穿搭风格',en:'WARDROBE',desc:'建立适合场景与气质的衣橱语言'},makeup:{name:'妆容建议',en:'MAKEUP',desc:'克制、可执行的面部重点建议'},tryon:{name:'试衣间',en:'VIRTUAL TRY-ON',desc:'上传全身照与服装图，生成写实试穿效果'}} as const
