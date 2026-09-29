const base=import.meta.env.VITE_API_BASE_URL||'/api'
export type Consultation={id:string;module:string;photo_url:string;garment_url?:string;presentation:string;preferences:string;status:'queued'|'running'|'succeeded'|'failed';analysis?:string;result_image_url?:string;error_code?:string;created_at:string}
function authHeader(){const token=uni.getStorageSync('mirror_token');return token?{Authorization:`Bearer ${token}`}:{}}
function request<T>(options:UniApp.RequestOptions){return new Promise<T>((resolve,reject)=>uni.request({...options,header:{...authHeader(),...options.header},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data as T):reject(r.data),fail:reject}))}
export function uploadPhoto(path:string){return new Promise<{url:string}>((resolve,reject)=>uni.uploadFile({url:`${base}/v1/assets`,filePath:path,name:'file',header:authHeader(),success:r=>r.statusCode===201?resolve(JSON.parse(r.data)):reject(r.data),fail:reject}))}
export const createConsultation=(data:Record<string,unknown>)=>request<Consultation>({url:`${base}/v1/consultations`,method:'POST',data})
export const getConsultation=(id:string)=>request<Consultation>({url:`${base}/v1/consultations/${id}`})
export const listConsultations=()=>request<{items:Consultation[]}>({url:`${base}/v1/consultations`})
export const sendEmailCode=(email:string)=>request<{sent:boolean}>({url:`${base}/v1/auth/email/code`,method:'POST',data:{email}})
export const loginWithEmail=(email:string,code:string)=>request<{token:string;email:string;nickname:string}>({url:`${base}/v1/auth/email/login`,method:'POST',data:{email,code}})
