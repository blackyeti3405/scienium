# ADR-002: Durable Paper Processing

## Decision

Every uploaded PDF creates one `PaperProcessingJob`. Processing claims are
atomic, retryable, and stored independently from a request lifetime. The upload
response remains asynchronous; the existing paper-status poll can safely process
an unclaimed or stale job.

## Consequences

- A serverless request ending cannot permanently strand an unrecorded task.
- Concurrent polls cannot duplicate the Anthropic call.
- Failures and attempt counts are inspectable and can later be consumed by a
  dedicated worker without changing the upload API.
