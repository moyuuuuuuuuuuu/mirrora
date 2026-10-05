// #ifdef H5
export async function downloadInBrowser(url: string, filename: string) {
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error('download_failed')
  const blob = await response.blob()
  const objectURL = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectURL
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[blob.type]
  link.download = extension ? filename.replace(/\.[^.]+$/, `.${extension}`) : filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectURL), 60000)
}

export function openImageInBrowser(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
// #endif
