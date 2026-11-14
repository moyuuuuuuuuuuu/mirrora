export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
}

export function apiError(status: number, data: unknown) {
  let body = data
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch {}
  }
  const code = body && typeof body === 'object' && 'error' in body ? String(body.error) : 'request_failed'
  return new ApiError(status, code)
}

export function errorMessage(error: unknown, fallback: string) {
  const messages: Record<string, string> = {
    rate_limited: '操作太频繁，请稍后再试',
    code_too_frequent: '验证码刚刚发送，请稍后再试',
    consultation_quota_exceeded: '今日咨询额度已用完，请稍后再来',
    consultation_in_progress: '已有咨询正在处理，请先到我的档案查看',
    consultation_queue_full: '当前咨询较多，请稍后再试',
    login_required: '登录已过期，请重新登录',
    session_changed: '登录状态已变化，请重新操作',
    invalid_parent_consultation: '当前版本无法继续编辑，请重新选择历史版本或恢复原图',
    workflow_not_configured: '该生成服务尚未配置，请稍后再试',
    invalid_photo: '照片无法读取，请重新选择',
    person_cutout_failed: '人物提取失败，请换一张主体清晰、光线均匀的照片再试',
    person_cutout_unavailable: '人物提取服务暂时不可用，请稍后重试',
    person_preparation_failed:'姿态候选保存未完成，原工作台已保留，请稍后重试',
    body_frame_incomplete:'人物画面不完整，无法核对全身比例。请确保从头到鞋完整入镜，不裁切腿脚。',
    body_limbs_occluded:'部分肢体被遮挡或不清晰，无法可靠核对比例。请让双臂自然下垂、双腿清楚可见后重拍。',
    body_not_clear:'无法可靠识别单个人物，请使用清晰、无遮挡的人物照片',
    body_proportions_changed:'生成结果未通过身体比例检查，当前形象已保留',
    invalid_edit_region:'服装编辑区域无效，请重新选择上衣区域',
    garment_region_not_clear:'无法可靠分离或对齐上衣，当前形象已保留，请换一张清晰的服装图',
    edit_region_canvas_mismatch:'生成图片与人物底图无法匹配，当前形象已保留',
    body_pose_changed:'生成结果改变了原站姿，已拦截，当前形象已保留',
    body_protection_failed:'身体比例检查未完成，当前形象已保留，请稍后重试',
    body_protection_unavailable:'身体保护服务暂不可用，请稍后重试',
    face_not_clear: '无法可靠保护脸部，请使用只有一人、脸部清晰无遮挡的正面照片',
    face_pose_changed: '生成结果的头部角度变化过大，已拦截以保护原脸，请保持原姿势重试',
    face_protection_failed: '脸部保护未通过，本次效果未保存，请重试',
    face_protection_unavailable: '脸部保护服务暂时不可用，请稍后重试',
    person_base_unconfirmed: '请先确认人物底图，再开始搭配',
    person_base_required: '这条记录缺少已确认人物底图。请重新上传本人照片并确认底图后再换装，避免沿用变形结果。',
    person_base_not_found: '人物底图不可用，请重新选择照片',
    invalid_studio_state: '搭配状态与底图不匹配，请重新打开该版本后再试',
    invalid_garment: '服装图片无法读取，请重新选择',
    photo_too_large: '图片超过大小限制，请压缩后上传',
    coze_resource_too_large: '单张图片不能超过 5 MB，请压缩后重新上传',
    coze_photo_too_large: '人物照片超过 5 MB，请压缩后重新上传',
    coze_garment_too_large: '服装图片超过 5 MB，请压缩后重新上传',
    asset_unavailable: '上传图片无法读取，请重新上传后再试',
    invalid_photo_dimensions: '图片尺寸过大或无法读取，请压缩后上传',
    invalid_avatar: '头像无法读取，请重新上传',
    invalid_current_password: '当前密码不正确',
    invalid_credentials: '账号或密码错误',
    invalid_or_expired_code: '验证码错误或已过期',
    email_send_failed: '验证码暂时无法发送，请稍后再试',
    email_auth_not_configured: '验证码服务暂时不可用',
    idempotency_conflict: '本次内容已发生变化，请重新发起咨询',
  }
  return error instanceof ApiError ? messages[error.code] || fallback : fallback
}
