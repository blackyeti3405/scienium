import 'server-only'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { serverEnv } from '@/lib/env'

// The R2 client is built lazily on first use (never at import) and memoized, so a
// missing R2_* var can't fail `next build` or a route that never touches storage.
// The client isn't exported — callers use the helpers below.
let cachedR2: S3Client | undefined
function r2(): S3Client {
  return (cachedR2 ??= new S3Client({
    region: 'auto',
    endpoint: `https://${serverEnv.R2_ACCOUNT_ID()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.R2_ACCESS_KEY_ID(),
      secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY(),
    },
  }))
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
  await r2().send(
    new PutObjectCommand({
      Bucket: serverEnv.R2_BUCKET_NAME(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/** Delete an object from R2. */
export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: serverEnv.R2_BUCKET_NAME(), Key: key }))
}

/** Fetch an object from R2 as a web ReadableStream for streaming to the client. */
export async function getObjectStream(key: string): Promise<{
  body: ReadableStream
  contentLength?: number
  contentType?: string
}> {
  const out = await r2().send(new GetObjectCommand({ Bucket: serverEnv.R2_BUCKET_NAME(), Key: key }))
  if (!out.Body) throw new Error(`R2 object has no body: ${key}`)
  return {
    body: (out.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream(),
    contentLength: out.ContentLength,
    contentType: out.ContentType,
  }
}