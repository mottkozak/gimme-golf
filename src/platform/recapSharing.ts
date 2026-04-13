import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativePlatform } from './runtime.ts'

export type PlatformShareResult = 'shared' | 'unsupported' | 'cancelled'

export interface PlatformShareOptions {
  title: string
  text: string
  url: string
  imageFile: File | null
}

export function createCanvasElement(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function createFileFromBlob(blob: Blob, fileName: string, type: string): File | null {
  if (typeof File === 'undefined') {
    return null
  }

  return new File([blob], fileName, { type })
}

async function encodeBlobToBase64(blob: Blob): Promise<string | null> {
  if (typeof FileReader === 'undefined') {
    return null
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const encoded = dataUrl.split(',', 2)[1] ?? ''
    return encoded.length > 0 ? encoded : null
  } catch {
    return null
  }
}

async function writeBlobToDirectory(
  blob: Blob,
  directory: Directory,
  fileName: string,
): Promise<string | null> {
  const base64Data = await encodeBlobToBase64(blob)
  if (!base64Data) {
    return null
  }

  try {
    const result = await Filesystem.writeFile({
      directory,
      path: fileName,
      data: base64Data,
      recursive: true,
    })
    return result.uri
  } catch {
    return null
  }
}

async function writeTextToDirectory(
  text: string,
  directory: Directory,
  fileName: string,
): Promise<string | null> {
  try {
    const result = await Filesystem.writeFile({
      directory,
      path: fileName,
      data: text,
      recursive: true,
    })
    return result.uri
  } catch {
    return null
  }
}

async function tryCapacitorShare(options: PlatformShareOptions): Promise<PlatformShareResult> {
  if (!isNativePlatform()) {
    return 'unsupported'
  }

  try {
    const hasSharing = await Share.canShare()
    if (!hasSharing.value) {
      return 'unsupported'
    }

    let imageUri: string | null = null
    if (options.imageFile) {
      imageUri = await writeBlobToDirectory(
        options.imageFile,
        Directory.Cache,
        `${Date.now()}-${options.imageFile.name}`,
      )
    }

    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      files: imageUri ? [imageUri] : undefined,
      dialogTitle: 'Share round recap',
    })

    return 'shared'
  } catch {
    return 'unsupported'
  }
}

export async function shareRecapViaNativeOrWeb(
  options: PlatformShareOptions,
): Promise<PlatformShareResult> {
  const nativeResult = await tryCapacitorShare(options)
  if (nativeResult === 'shared') {
    return nativeResult
  }

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported'
  }

  const shareData: ShareData = {
    title: options.title,
    text: options.text,
    url: options.url,
  }

  try {
    if (
      options.imageFile &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [options.imageFile] })
    ) {
      await navigator.share({
        ...shareData,
        files: [options.imageFile],
      })
      return 'shared'
    }

    await navigator.share(shareData)
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    return 'unsupported'
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadBlobAsFile(blob: Blob, fileName: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return false
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)

  return true
}

export async function saveBlobToDocuments(blob: Blob, fileName: string): Promise<boolean> {
  if (!isNativePlatform()) {
    return false
  }

  const filePath = await writeBlobToDirectory(blob, Directory.Documents, fileName)
  return filePath !== null
}

export async function saveTextToDocuments(text: string, fileName: string): Promise<boolean> {
  if (!isNativePlatform()) {
    return false
  }

  const filePath = await writeTextToDirectory(text, Directory.Documents, fileName)
  return filePath !== null
}
