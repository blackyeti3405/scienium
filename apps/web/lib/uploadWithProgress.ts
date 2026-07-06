/**
 * Small XHR wrapper so upload sites can drive a `PixelProgressBar` with real
 * bytes. `fetch` has no upload-progress event, so this is the one place we
 * reach for XMLHttpRequest instead. Returns a fetch-`Response`-like object
 * (status/ok/json/text) so call sites don't need to branch on XHR vs fetch.
 */

export interface UploadProgressResponseLike {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (fraction: number) => void,
): Promise<UploadProgressResponseLike> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total)
      }
    }

    xhr.onload = () => {
      const status = xhr.status
      const body = xhr.responseText
      resolve({
        ok: status >= 200 && status < 300,
        status,
        // Like fetch's res.json(), rejects on an unparsable body so callers'
        // catch blocks surface it as a failed upload instead of reading {}.
        json: async () => JSON.parse(body),
        text: async () => body,
      })
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload aborted'))

    xhr.send(formData)
  })
}
