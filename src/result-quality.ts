import type { Consultation } from './api'

export function resultWarning(item?: Consultation) {
  if (!item) return ''
  if (['未接收到您上传照片', '未收到您上传的照片', '未获取到您上传的照片', '未获取到您上传照片', '没有收到您上传的照片'].some(phrase => item.analysis?.includes(phrase)))
    return '本次文字分析未能读取照片，以下内容不是针对你的有效建议，请重新咨询。'
  if (!item.result_image_url?.trim())
    return '本次结果不完整：工作流未返回效果图。下方保留已返回的文字建议，可重新咨询获取完整结果。'
  return ''
}
