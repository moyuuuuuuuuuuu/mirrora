import { apiError, ApiError } from './api-error'
import { expireSession } from './auth'
export { ApiError, errorMessage } from './api-error'
const base=import.meta.env.VITE_API_BASE_URL||'/api'
export type Consultation={id:string;module:string;photo_url:string;garment_url?:string;presentation:string;preferences:string;status:'queued'|'running'|'succeeded'|'failed';analysis?:string;result_image_url?:string;error_code?:string;error_detail?:string;created_at:string}
export type ConsultationPage={items:Consultation[];page:number;page_size:number;total:number;completed_modules:string[]}
function authHeader(){const token=uni.getStorageSync('mirror_token');return token?{Authorization:`Bearer ${token}`}:{}}
function rejected(status:number,data:unknown,token:unknown){const error=apiError(status,data);if(status===401&&token&&token===uni.getStorageSync('mirror_token'))expireSession();return error}
function request<T>(options:UniApp.RequestOptions){
  const token=uni.getStorageSync('mirror_token')
  return new Promise<T>((resolve,reject)=>uni.request({...options,timeout:30000,header:{...authHeader(),...options.header},success:r=>{
    if(token!==uni.getStorageSync('mirror_token')){reject(new ApiError(409,'session_changed'));return}
    r.statusCode>=200&&r.statusCode<300?resolve(r.data as T):reject(rejected(r.statusCode,r.data,token))
  },fail:reject}))
}
export function uploadPhoto(path:string,kind:'avatar'|'upload'='upload'){
  const token=uni.getStorageSync('mirror_token')
  return new Promise<{url:string}>((resolve,reject)=>uni.uploadFile({url:`${base}/v1/assets`,filePath:path,name:'file',formData:{kind},header:authHeader(),timeout:60000,success:r=>{
    if(token!==uni.getStorageSync('mirror_token')){reject(new ApiError(409,'session_changed'));return}
    if(r.statusCode!==201){reject(rejected(r.statusCode,r.data,token));return}
    try{const data=JSON.parse(r.data);if(typeof data.url!=='string')throw new Error('invalid_upload_response');resolve(data)}catch{reject(new ApiError(502,'invalid_upload_response'))}
  },fail:reject}))
}
export const createConsultation=(data:Record<string,unknown>)=>request<Consultation>({url:`${base}/v1/consultations`,method:'POST',data})
export const getConsultation=(id:string)=>request<Consultation>({url:`${base}/v1/consultations/${id}`})
export const listConsultations=(params:{page?:number;page_size?:number;module?:string}={})=>{const query=Object.entries(params).filter(([,value])=>value!==undefined&&value!=='').map(([key,value])=>`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');return request<ConsultationPage>({url:`${base}/v1/consultations${query?`?${query}`:''}`})}
export const sendEmailCode=(email:string)=>request<{sent:boolean}>({url:`${base}/v1/auth/email/code`,method:'POST',data:{email}})
export const loginWithEmail=(email:string,code:string)=>request<{token:string;email:string;nickname:string;avatar:string}>({url:`${base}/v1/auth/email/login`,method:'POST',data:{email,code}})
export const loginWithPassword=(email:string,password:string)=>request<{token:string;email:string;nickname:string;avatar:string}>({url:`${base}/v1/auth/password/login`,method:'POST',data:{email,password}})
export type UserProfile={email:string;nickname:string;avatar:string;has_password:boolean}
export const getProfile=()=>request<UserProfile>({url:`${base}/v1/profile`})
export const updateProfile=(data:{nickname:string;avatar:string})=>request<UserProfile>({url:`${base}/v1/profile`,method:'PUT',data})
export const updatePassword=(data:{current_password:string;new_password:string})=>request<{updated:boolean}>({url:`${base}/v1/profile/password`,method:'PUT',data})
