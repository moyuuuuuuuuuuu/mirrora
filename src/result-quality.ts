import type { Consultation } from './api'

export function resultWarning(item?: Consultation) {
  if (!item) return ''
  if (/(?:未(?:接收|收|获取)到|没有收到)(?:您|你)?(?:上传)?(?:的)?(?:待分析)?(?:实拍)?(?:照片|图片)/.test(item.analysis || ''))
    return '本次文字分析未能读取照片，以下内容不是针对你的有效建议，请重新咨询。'
  if (!item.result_image_url?.trim())
    return '本次结果不完整：工作流未返回效果图。下方保留已返回的文字建议，可重新咨询获取完整结果。'
  return ''
}
