# Legal review notes — Privacy Policy and Terms of Service v1.0

_Written 2026-08-06 alongside the interim documents at `/privacy` and `/terms`
(source: `apps/web/lib/legal/`). These are **not attorney-drafted**. They were
written against the actual working tree so that every factual claim is true today,
which is the part a template gets wrong and the part an attorney cannot verify
without reading the code. Hand this file to counsel with the documents._

---

## 1. Identity — filled in, with two open items

`apps/web/lib/legal/shared.ts` now names a real party:

| Constant | Value |
| --- | --- |
| `entity` | Rig Saini, operating as an individual (no company) |
| `address` | set from `LEGAL_CONTACT_ADDRESS` in the deployment environment — deliberately not recorded in this repository |
| `governingState` / `governingCounty` | California / Santa Clara |
| `effectiveDate` / `version` | August 6, 2026 / 1.0 — bump on every substantive edit |

Both documents are written in the first person singular ("I, Rig Saini") with
"we/us/our" defined as meaning that one person. **Forming an LLC is not a
one-constant change**: the opening paragraph of each document, ToS §15
(ownership), §20 (liability), §21 (indemnity), §24 (assignment), and Privacy §9
(business transfer) all name a person and would have to name the entity.

Two open items:

- **No entity means no liability shield.** The cap in ToS §20 limits what can be
  claimed, but whatever survives it reaches personal assets — on a product
  serving minors, involving physical experimentation and AI-generated content. A
  California LLC has historically cost $70 to file plus an $800 annual minimum
  franchise tax — confirm both against the Secretary of State and Franchise Tax
  Board before budgeting. Forming one
  before a district signs anything is the single largest risk reduction
  available, and district procurement is markedly more comfortable contracting
  with an entity than with a person.
- **The address is a residence.** It is still published on a page aimed at minors
  and is the operator's contact of record. A PO box or virtual mailbox (~$10–20 a
  month), or a registered agent's address once an LLC exists, removes a home
  address from a public page without weakening the notice. **The source tree no
  longer carries it**: `LEGAL.address` reads `LEGAL_CONTACT_ADDRESS` from the
  deployment environment (`apps/web/lib/legal/shared.ts`), so publishing this
  repository does not publish the address. That is containment, not a fix — the
  live page still shows a home address until a mailbox replaces it.
- **DMCA safe harbour** requires a designated agent **registered with the US
  Copyright Office** (~$6, dmca.copyright.gov). ToS §9 describes the notice
  process but the safe harbour does not attach until the agent is registered.

## 2. Decisions deliberately made, for counsel to confirm or reverse

Each of these is a real fork. The choice taken is stated with its reasoning so
counsel can overrule it quickly rather than reconstruct it.

| Decision | What was chosen | Reasoning | Reconsider if |
| --- | --- | --- | --- |
| **Arbitration / class waiver** | **Omitted.** Informal resolution, then named courts. | Enforcing arbitration against minors is contested in many states, and district procurement often rejects it outright. | Counsel judges the class-action exposure to outweigh the procurement friction. |
| **Indemnity from students** | **Excluded for under-18s**; binds schools and adult account holders only. | An indemnity from a 15-year-old is largely unenforceable and reads badly to a reviewing district. | Never — but the school-side clause should be reviewed against district contract norms. |
| **Ownership of student work** | Students keep it; we take a narrow operational licence that ends on deletion. | A broad content licence is the single most common reason schools reject an edtech ToS. | Only if a specific product need appears (e.g. a marketing gallery), and then narrow the grant to published projects. |
| **Liability cap** | Greater of fees paid or $100, with carve-outs for gross negligence, willful misconduct, fraud, personal injury, and the privacy commitments. | A $0 cap on a free service is often struck; the carve-outs are what keeps the clause credible. | Counsel prefers a fixed figure or a different carve-out set. |
| **Minimum age 13, under-13 only via school** | Stated in both documents. | Keeps direct COPPA verifiable-parental-consent machinery out of scope. | The pilot includes middle-school direct signups — then §3 needs a real consent flow, not just words. |
| **Scope: US only** | No GDPR/UK sections; ToS and policy say the service is US-directed. | No EEA/UK users are expected. | A single EEA or UK school joins — this is a real gap, not a small one, and needs its own review. |
| **No arbitration of the "school is the controller" question** | Policy says the school directs use and may designate us a FERPA school official. | Standard posture. | Counsel prefers explicit processor/controller language or a formal DPA template. |

## 3. Gaps between the documents and the product

These are places where the documents currently say the right thing, but the
product has to change, or the claim will become false. **A privacy policy that
describes practices the code does not have is a deceptive-practices problem, not
a paperwork problem.**

| Gap | Status | Action |
| --- | --- | --- |
| **Nobody has to accept the Terms.** | **Closed.** A required checkbox now sits above the submit button on both the student and teacher onboarding forms, linking to both documents. All three routes that can create a `User` row (`/api/onboarding`, `/api/team/join`, `/api/onboarding/teacher`) reject a body without it, and `users.legal_accepted_at` / `legal_version` record which version was agreed to, stamped server-side and never overwritten by a re-submit. `test/legal-consent.test.ts` fails if a fourth signup route is added ungated. | Two things remain: (a) **existing accounts have NULL** — they predate the gate and were never asked, which is the honest record but means they have not accepted; decide whether to prompt them. (b) The Clerk-hosted sign-up card itself has no checkbox — enable **Configure → Legal** in the Clerk dashboard with the `/terms` and `/privacy` URLs to add one at the credential step too. |
| **Re-consent on version bump.** Nothing prompts a user whose `legal_version` is older than `LEGAL.version`. | Open, not yet needed (only v1.0 exists). | The column makes it a query when v2.0 ships. Both documents promise 30 days' advance notice of material changes — that notice, not a forced re-tick, is the commitment. |
| **Retention windows are unset.** `retention_policies` ships empty and the registry fails safe to KEEP. | Policy §12 states this honestly rather than promising a schedule we do not have. | Set the windows with school input, then replace §12's "without a fixed schedule yet" table with real numbers. |
| **Under-13 detection.** `users.is_minor` defaults to `true` and no birthdate is collected, so we cannot detect an under-13 direct signup. | Policy §3 says we act "if we learn" — accurate today. | Decide whether a school-required signup path is enforced for anyone who cannot attest to being 13+. |
| **Breach notification.** Policy §13 commits to notifying without unreasonable delay. | Incident-response runbook exists (`docs/runbooks/incident-response.md`). | Confirm the runbook's notification step names schools and the state-law deadlines. |
| **Export delivery.** Policy §14 says exports are delivered through the school's agreed channel, never emailed. | Matches the runbook. | Keep it that way; do not add an in-app download without revisiting. |
| **Data privacy agreements.** Policy §16 invites schools to request one. | No template exists. | Districts will ask, often with a state-specific addendum (NDPA is the common one). Have a position before the pilot. |
| **Prior versions on request** (ToS §23). | No archive exists. | Tag the `lib/legal/` files on each version bump — git already does this, just make sure someone can retrieve them. |
| **Subprocessor list drift** (Privacy Appendix A). | Accurate as of today. | Any new provider in `.env.example` is a policy edit. Worth a note in the PR checklist. |

## 4. Fault points these documents were written to avoid

Recorded so a future edit does not reintroduce one.

1. **Template boilerplate describing practices we do not have.** No advertising
   partners, no analytics vendors, no "we may share with trusted partners". The
   provider list is the real one from `.env.example`.
2. **Silence about what is *not* collected.** Privacy §5 is explicit — no
   birthdate, no address, no geolocation, no biometrics — because omission reads
   as concealment to a district reviewer.
3. **Vague AI language.** §7 states what is sent, what is not sent (identity),
   the provider's training position, what we cache, and that output can be wrong.
4. **No change-notice mechanism.** Both documents commit to advance notice and to
   school agreement for material expansions of student-data use.
5. **Overbroad content licence.** Narrowed to operation, with explicit
   termination and explicit carve-outs for team work and backups.
6. **No stated basis for teacher visibility.** Privacy §9 and §16 say plainly
   that teachers see their own students' work and nobody else's.
7. **Deletion described as more complete than it is.** Privacy §12 states exactly
   what survives an erasure (team work, tombstoned user row, opaque log entries)
   rather than claiming everything disappears.
8. **Public-publication risk understated.** Privacy §10 and ToS §10 both say
   public means permanent, and that a teacher approves the exact reviewed version.
9. **Safety.** ToS §13 disclaims any role in real-world experimentation, which
   for a science-fair product is the largest non-privacy exposure.
10. **Science-fair rules.** ToS §12 says in-app fair guidance is informational and
    may be incomplete — consistent with the private security register, which records that
    ISEF applicability guidance is gated behind a qualified review.

## 5. Suggested order of work

1. Fill `shared.ts`. Form the entity. Register the DMCA agent.
2. Attorney review of both documents, focused on §2 above.
3. Set retention windows with school input; update Privacy §12.
4. Prepare a school data privacy agreement / NDPA position before the first
   district asks.

## 6. If the operator is a minor

Worth raising with counsel because it is easy to miss: in California a contract
signed by a minor is generally voidable by that minor. If the person operating
scienium is under 18, that cuts both ways — it affects the enforceability of
the ToS *against* users far less than it affects agreements the operator signs
*with* schools and districts, which is where it will actually matter. A parent or
guardian as a co-signer, or an LLC with an adult member, is the usual answer.

This note makes no assumption about anyone's age; it is here because a
student-built product for a school pilot is exactly the case where nobody thinks
to ask.
