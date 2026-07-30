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
  /**
   * Cancels the request in flight. `useUploadSlot` (lib/upload-slot.ts) passes
   * the signal of the attempt that owns a form slot, so a form unmounting
   * mid-upload stops sending bytes instead of leaking the request (P2-2). The
   * server-side reservation left behind is `temporary` and is reclaimed by the
   * sweep (`reclaimAbandonedAssets`) — that is the release path; there is no
   * client-callable one.
   */
  signal?: AbortSignal,
): Promise<UploadProgressResponseLike> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Upload aborted'))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    const onAbort = () => xhr.abort()
    signal?.addEventListener('abort', onAbort)
    const release = () => signal?.removeEventListener('abort', onAbort)

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total)
      }
    }

    xhr.onload = () => {
      release()
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

    xhr.onerror = () => {
      release()
      reject(new Error('Network error during upload'))
    }
    xhr.onabort = () => {
      release()
      reject(new Error('Upload aborted'))
    }

    xhr.send(formData)
  })
}
