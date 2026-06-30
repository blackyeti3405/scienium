import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export async function getUploadSignedUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

export async function getDownloadSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

// ─── Server-side object access ────────────────────────────────────────────────
// Used for private team uploads (e.g. paper PDFs): the app reads/writes objects
// directly and streams them through its own authenticated routes — no public or
// signed URLs are ever handed to the browser.

/** Canonical R2 key for a paper's PDF, namespaced by team for tidy listing. */
export function paperPdfKey(teamId: string, paperId: string): string {
  return `papers/${teamId}/${paperId}.pdf`
}

/** Upload bytes to R2 under `key`. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/** Delete an object from R2. */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
}

/** Fetch an object from R2 as a web ReadableStream for streaming to the client. */
export async function getObjectStream(key: string): Promise<{
  body: ReadableStream
  contentLength?: number
  contentType?: string
}> {
  const out = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
  if (!out.Body) throw new Error(`R2 object has no body: ${key}`)
  return {
    body: (out.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream(),
    contentLength: out.ContentLength,
    contentType: out.ContentType,
  }
}
