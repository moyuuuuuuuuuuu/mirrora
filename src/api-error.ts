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
    invalid_photo: '照片无法读取，请重新选择',
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
