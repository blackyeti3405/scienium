# ADR-002: Durable Paper Processing

## Decision

Every uploaded PDF creates one `PaperProcessingJob`. Processing claims are
atomic, retryable, and stored independently from a request lifetime. The upload
response remains asynchronous; the existing paper-status poll can safely process
an unclaimed or stale job.

Retries are real: the job carries `nextRunAt` (backed-off scheduling) and
`terminalAt` (exhaustion). A transient failure keeps the paper in `processing` while
attempts remain (capped at three) and only becomes `error` once retries are exhausted;
the papers cron terminalizes a final attempt that crashed mid-run.

Paper metadata is stored on `Paper` (`doi`/`credibilityTier`/`sourceHost`) so list
reads never load full text, and `(teamId, contentHash)` is unique so a duplicate
upload is a 409 at the database.

## Consequences

- A serverless request ending cannot permanently strand an unrecorded task.
- Concurrent polls cannot duplicate the Anthropic call.
- A momentary Anthropic failure no longer presents as a permanently broken paper.
- Failures and attempt counts are inspectable and can later be consumed by a
  dedicated worker without changing the upload API.
