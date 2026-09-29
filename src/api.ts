const base=import.meta.env.VITE_API_BASE_URL||'/api'
export type Consultation={id:string;module:string;photo_url:string;garment_url?:string;presentation:string;preferences:string;status:'queued'|'running'|'succeeded'|'failed';analysis?:string;result_image_url?:string;error_code?:string;error_detail?:string;created_at:string}
export type ConsultationPage={items:Consultation[];page:number;page_size:number;total:number;completed_modules:string[]}
function authHeader(){const token=uni.getStorageSync('mirror_token');return token?{Authorization:`Bearer ${token}`}:{}}
function request<T>(options:UniApp.RequestOptions){return new Promise<T>((resolve,reject)=>uni.request({...options,header:{...authHeader(),...options.header},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data as T):reject(r.data),fail:reject}))}
export function uploadPhoto(path:string){return new Promise<{url:string}>((resolve,reject)=>uni.uploadFile({url:`${base}/v1/assets`,filePath:path,name:'file',header:authHeader(),success:r=>r.statusCode===201?resolve(JSON.parse(r.data)):reject(r.data),fail:reject}))}
export const createConsultation=(data:Record<string,unknown>)=>request<Consultation>({url:`${base}/v1/consultations`,method:'POST',data})
export const getConsultation=(id:string)=>request<Consultation>({url:`${base}/v1/consultations/${id}`})
export const listConsultations=(params:{page?:number;page_size?:number;module?:string}={})=>{const query=Object.entries(params).filter(([,value])=>value!==undefined&&value!=='').map(([key,value])=>`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');return request<ConsultationPage>({url:`${base}/v1/consultations${query?`?${query}`:''}`})}
export const sendEmailCode=(email:string)=>request<{sent:boolean}>({url:`${base}/v1/auth/email/code`,method:'POST',data:{email}})
export const loginWithEmail=(email:string,code:string)=>request<{token:string;email:string;nickname:string;avatar:string}>({url:`${base}/v1/auth/email/login`,method:'POST',data:{email,code}})
export type UserProfile={email:string;nickname:string;avatar:string}
export const getProfile=()=>request<UserProfile>({url:`${base}/v1/profile`})
export const updateProfile=(data:{nickname:string;avatar:string})=>request<UserProfile>({url:`${base}/v1/profile`,method:'PUT',data})
