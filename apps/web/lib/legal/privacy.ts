import { LEGAL } from './shared'

/**
 * The Privacy Policy, as markdown. Rendered by `components/legal/LegalDocument`.
 *
 * Every factual claim here was written against the working tree, not from a
 * template: the provider list matches `.env.example`, the erasure behaviour
 * matches `docs/runbooks/data-export-delete.md`, the retention position matches
 * `lib/retention/policies.ts` (which ships with empty windows), and the
 * "we collect no birthdate" claim matches the `users` table. If any of those
 * change, this file is part of the change — a policy that describes practices
 * the code does not have is the single most common way these documents create
 * liability rather than reduce it.
 */
export const PRIVACY_POLICY_MD = `
**Effective ${LEGAL.effectiveDate}** — Version ${LEGAL.version}

I, ${LEGAL.entity}, operate ${LEGAL.product}, a browser-based science-research
game and classroom tool at ${LEGAL.site}. ${LEGAL.product} is run by me as an
individual — there is no company behind it — and in this policy "we", "us", and
"our" mean me.

This policy explains what information ${LEGAL.product} collects, why, who it is
shared with, how long it is kept, and the choices students, parents, teachers,
and schools have.

${LEGAL.product} is used by minors in classrooms. We have written this policy to
be read, not skimmed past — the short version below is accurate, and the sections
after it are the complete version.

## The short version

- We collect what is needed to run a research-lab game and show a teacher how
  their students are doing. Nothing more.
- **We do not sell personal information. We do not share it for cross-context
  behavioral advertising. We do not serve ads at all.**
- There are **no third-party analytics, advertising, or tracking SDKs** in
  ${LEGAL.product}. No Google Analytics, no ad pixels, no data brokers.
- We do not ask for birthdates, home addresses, phone numbers, government
  identifiers, precise location, or biometrics, and the app has no field to
  enter them.
- Student writing is sent to our AI provider to generate quizzes, explanations,
  and feedback. Our AI provider states that it does not use API inputs or
  outputs to train its models.
- School work is visible to the student's teammates and their teacher. It is
  only visible to the public if the student chooses to publish it **and** a
  teacher approves it.
- You can request a copy of your data or its deletion at any time. For students
  under 18, the school approves the request, because the authority over a
  minor's school record belongs to the school.

## Contents

1. [Who this policy covers](#1-who-this-policy-covers)
2. [Two ways ${LEGAL.product} is used, and who is responsible](#2-two-ways-scienium-is-used-and-who-is-responsible)
3. [Age requirements](#3-age-requirements)
4. [Information we collect](#4-information-we-collect)
5. [What we deliberately do not collect](#5-what-we-deliberately-do-not-collect)
6. [How we use information](#6-how-we-use-information)
7. [AI features and what happens to student writing](#7-ai-features-and-what-happens-to-student-writing)
8. [Cookies and similar technologies](#8-cookies-and-similar-technologies)
9. [How we share information](#9-how-we-share-information)
10. [The public showcase](#10-the-public-showcase)
11. [Where data is stored](#11-where-data-is-stored)
12. [How long we keep data](#12-how-long-we-keep-data)
13. [Security](#13-security)
14. [Your choices and rights](#14-your-choices-and-rights)
15. [Information for parents and guardians](#15-information-for-parents-and-guardians)
16. [Information for schools: FERPA, COPPA, and state student-privacy laws](#16-information-for-schools-ferpa-coppa-and-state-student-privacy-laws)
17. [California residents](#17-california-residents)
18. [Other US state privacy rights](#18-other-us-state-privacy-rights)
19. [Third-party sites and research content](#19-third-party-sites-and-research-content)
20. [Changes to this policy](#20-changes-to-this-policy)
21. [How to contact us](#21-how-to-contact-us)
- [Appendix A: Service providers](#appendix-a-service-providers)
- [Appendix B: Data categories at a glance](#appendix-b-data-categories-at-a-glance)

## 1. Who this policy covers

This policy applies to everyone who uses ${LEGAL.product}: students, teachers,
school administrators, and visitors who view a published project in the public
gallery without an account.

It applies to the ${LEGAL.product} website and application. It does not apply to
a school's own systems, to a third-party site you reach through a link in a
research paper, or to any service that has its own privacy policy.

## 2. Two ways scienium is used, and who is responsible

**Through a school.** A teacher creates a class, students join it with a class
code, and the teacher approves each student. In this arrangement the school
directs how student data is used, and we act on the school's behalf as a service
provider and, where applicable, as a "school official" with a legitimate
educational interest under FERPA (see [section 16](#16-information-for-schools-ferpa-coppa-and-state-student-privacy-laws)).
The school is responsible for providing any notice or consent that its
district policy or applicable law requires. We use student data only to provide
and improve ${LEGAL.product} for that school, and we follow the school's
instructions about correction, export, and deletion.

**Directly, without a school.** A student aged ${LEGAL.minimumAge} or older, or a
teacher, may create an account without a class. In this arrangement no school is
in the loop, so we are directly responsible for the data, and the rights in
[section 14](#14-your-choices-and-rights) are exercised with us. If the user is
under 18, we ask that a parent or guardian review this policy with them; a parent
or guardian may exercise every right in section 14 on the student's behalf.

An account can move from one arrangement to the other — a student who signed up
directly and later joins a class becomes school-directed from that point forward,
and their earlier work moves with them.

## 3. Age requirements

${LEGAL.product} accounts are for people aged ${LEGAL.minimumAge} and older.

Children under ${LEGAL.minimumAge} may use ${LEGAL.product} **only** through a
school that has provided consent on the parents' behalf, as permitted under the
Children's Online Privacy Protection Act ("COPPA") when a service is used solely
for school-authorized educational purposes. A school that enrolls students under
${LEGAL.minimumAge} confirms to us that it has authority to give that consent and
has given parents the notice its own policy requires.

We do not knowingly collect personal information from a child under
${LEGAL.minimumAge} who signed up on their own, without a school. If we learn
that we have, we delete the account and its data promptly. A parent or guardian
who believes a child under ${LEGAL.minimumAge} has created an account without
school involvement should email ${LEGAL.contactEmail} and we will delete it.

Because we ask for a school and class at sign-up and not for a birthdate, we
treat every student account as belonging to a minor by default and apply the
protections in this policy to all of them.

## 4. Information we collect

### 4.1 What you or your school give us

| Data | Where it comes from | Why |
| --- | --- | --- |
| Name and email address | You, at sign-up, through our authentication provider | To create the account, address you in the app, and let a teacher recognize you on a roster |
| Password or third-party sign-in | You, entered directly into our authentication provider | To sign you in. **We never see or store your password.** |
| Role (student, teacher, administrator) | Chosen at sign-up | To determine what the account can see and do |
| School name and class name | Typed by you or your teacher | To place you in the right classroom |
| Team name and membership | Your team lead or teacher | Teamwork is the core of the product |
| Class join code | Your teacher | To enroll you in the right class |

### 4.2 What is created as you use ${LEGAL.product}

This is the bulk of what we hold. It is schoolwork and game state.

- **Research work:** research papers you upload (PDFs), papers you save from
  scholarly search, notes, source relevance judgments, your discovery graph,
  synthesis matrices, research plans, idea checks, and vocabulary cards.
- **Learning records:** quiz sessions and answers, explain-back attempts and
  their scores, paper proficiency levels, Field Codex lesson progress, and
  expertise exam attempts.
- **Written work:** project log entries, dataset notes, showcase titles and
  abstracts, and any other text you type into the app.
- **Files you upload:** paper PDFs, project-log photographs, showcase board
  images and visuals, and dataset files.
- **Conversations with the in-app AI assistant:** the messages you send and the
  replies you receive, in paper chat and Study-with-Vega.
- **Teacher records:** feedback a teacher writes on your work, rubric scores, and
  a teacher's view of your class's progress.
- **Game state:** knowledge points, buildings you have bought and placed, daily
  task progress, science-fair associations and deadlines, and Battle Arena
  results such as spells used and trophies.
- **Notifications:** in-app notifications, your notification preferences, and, if
  you opt in to email reminders, the record that an email was sent to you.

### 4.3 What is collected automatically

- **Session and authentication data** handled by our authentication provider:
  session identifiers, sign-in times, and the cookies that keep you signed in.
- **Server logs.** Our application logs are written under a redaction policy that
  records opaque identifiers and event names only — not names, not email
  addresses, not the content of student work. Our hosting provider keeps its own
  request logs, which include IP address, according to its retention schedule.
- **Error reports.** When something breaks, an error report may be sent to our
  error-tracking provider. These contain technical information about the failure
  and an opaque user identifier.
- **Rate-limit counters.** To keep the service available and to control the cost
  of AI features, we count recent requests against your account identifier and,
  for signed-out requests, your IP address. These counters expire within about a
  minute and are not used for any other purpose.
- **Public gallery view counts.** When someone views a published project, we
  record one view per visitor per day using a **salted one-way hash** of request
  attributes. **The raw IP address is never stored.** These records are deleted
  after 90 days.
- **Security events.** A bounded record of security-relevant actions — a role
  change, a denied access attempt — containing opaque identifiers and a fixed
  event name, never free text or content.
- **AI usage accounting.** Token counts and estimated cost per AI call, so we can
  see and cap what the service spends. This contains no message content.

We do not use device fingerprinting for tracking, and we do not build advertising
or behavioral profiles.

### 4.4 Information from third parties

- **Our authentication provider** returns your verified email address and, if you
  use a third-party sign-in, your name.
- **Your school or teacher** may tell us which class and team you belong to.
- **Public research databases** supply paper metadata, abstracts, citation
  relationships, patent records, and plain-language health explainers. When we
  query them we send search terms and paper identifiers. **We do not send your
  name, email address, or account identifier to any research database.**

## 5. What we deliberately do not collect

We want this to be explicit, because a privacy policy that stays silent about
these is usually hiding one of them:

- No date of birth, and no age beyond the school-or-not distinction.
- No home address, phone number, or emergency contact.
- No government identifier, student identification number issued by the state,
  or social security number.
- No precise geolocation. No GPS, no location permissions requested.
- No biometric data, no photographs of faces collected by us (a student may
  upload a photo to a project log; see the rules in our Terms of Service).
- No health information, other than what a student may choose to type while
  researching a health topic.
- No contact list, calendar, microphone, or camera access.
- No advertising identifiers, and no third-party analytics or advertising code
  of any kind.
- No purchase or payment information — ${LEGAL.product} is free today and
  collects no payment details.

## 6. How we use information

We use the information described above only for these purposes:

1. **To provide the product** — sign you in, load your lab, save your work, run
   the game, and show your team's progress.
2. **To generate learning content** — quizzes, explain-back grading, source
   explanations, and AI assistant replies, as described in
   [section 7](#7-ai-features-and-what-happens-to-student-writing).
3. **To let a teacher teach** — show the teacher of your class your work,
   progress, and submissions, and let them leave feedback and approve
   publication.
4. **To send notifications you asked for** — deadline reminders and in-app
   notices, with email only if you opt in.
5. **To keep the service safe and available** — rate limiting, abuse detection,
   moderation of published content, security monitoring, and incident response.
6. **To control cost** — AI spend accounting and caps, because AI calls cost real
   money and an uncapped bug is a real bill.
7. **To fix and improve ${LEGAL.product}** — diagnose errors, understand which
   features are used, and make the product better. When we do this we work with
   aggregated or de-identified information wherever it will answer the question.
8. **To comply with law** and to enforce our Terms of Service.

**We do not:** sell personal information; share it for cross-context behavioral
advertising; use student data to build a profile for any purpose other than
providing ${LEGAL.product}; serve targeted advertising; or use student personal
information to train third-party AI models.

## 7. AI features and what happens to student writing

Several features are powered by a large-language-model provider (Anthropic).
Being precise about this matters more than any other paragraph in this policy.

**What is sent.** When you use a feature that generates content — a quiz from a
paper, an explanation of a source, grading of an explain-back answer, a reply in
paper chat or Study-with-Vega, a relevance check — we send the provider the text
that feature needs. That can include the text of a paper you uploaded, the
question or message you typed, and a small amount of context about the task.

**What is not sent.** We do not send your name, your email address, your school,
or your account identifier. The provider receives the schoolwork, not the
student's identity.

**Training.** Our AI provider states in its commercial terms that it does not use
inputs submitted through its API, or the outputs it returns, to train its models.
It retains limited data for a short period for abuse detection and legal
compliance. We rely on those terms; we do not control them, and you should read
the provider's own policy if this matters to you.

**What we keep.** We store the resulting quizzes, explanations, grades, and chat
transcripts in your account so the app can show them to you and your teacher
again. We also keep a short-lived record of AI calls keyed by a hash of their
inputs, so that a repeated or retried request replays the answer we already paid
for instead of calling the provider a second time.

**Accuracy.** AI output can be wrong, incomplete, or confidently mistaken. It is
a study aid, not a source of truth, and it is never a substitute for reading the
paper, your teacher's instruction, medical or safety advice, or a science-fair
rulebook. Verify anything that matters.

**What not to type.** Please do not type sensitive personal information — about
yourself or anyone else — into an AI chat or any free-text field. Nothing in the
product needs it.

**Human review.** We may review AI conversations and generated content when
investigating abuse, a safety report, a bug, or a cost anomaly. Teachers can see
the AI-assisted work their own students produce.

## 8. Cookies and similar technologies

${LEGAL.product} uses **strictly necessary cookies only**:

| Purpose | Set by | What it does |
| --- | --- | --- |
| Authentication and session | Our authentication provider | Keeps you signed in and protects against request forgery. Without it, the app cannot work. |
| Hosting and routing | Our hosting provider | Load balancing and request correlation. |

We do not use advertising cookies, analytics cookies, social-media pixels, or
any cookie that follows you to another website. Because there are no
non-essential cookies, ${LEGAL.product} does not show a cookie consent banner —
there is nothing to consent to beyond what is required to sign you in.

**Do Not Track and Global Privacy Control.** ${LEGAL.product} does not track
users across third-party websites, so there is no cross-site tracking to
disable. We honor a Global Privacy Control signal as a request to opt out of
sale or sharing; since we do neither, the signal changes nothing about how we
handle your data.

Local storage in your browser is used to remember interface preferences and to
run the in-browser Python environment used by the Data Terminal. That data stays
on your device.

## 9. How we share information

We share personal information only in the situations below.

**Within your class and team.** Your teammates see the team's shared work.
The teacher of your class sees your work, progress, submissions, and the
feedback they have given you. A school administrator associated with your school
may see class-level information. The Battle Arena trophy leaderboard shows
**team** names and trophy counts to other teams in the same class — not student
names, and not to anyone outside the class.

**Publicly, only if you and a teacher both choose it.** See
[section 10](#10-the-public-showcase).

**With service providers who run parts of the product.** Each provider receives
only what its job requires, and is contractually limited to using it for that
job. The full list is in [Appendix A](#appendix-a-service-providers).

**With your school.** If you use ${LEGAL.product} through a school, we share your
information with that school on request, and follow its instructions about your
records.

**For legal reasons.** When required by law, subpoena, or valid legal process,
or to establish or defend legal claims. Where we are permitted to do so, and the
request concerns a student, we will notify the school before responding.

**In an emergency.** If we believe in good faith that disclosure is necessary to
prevent imminent physical harm to a person, we may share information with the
school, a parent, or an appropriate authority.

**In a business transfer.** If I transfer ${LEGAL.product} to a company I form,
or sell it or its assets to someone else, information may transfer with it.
Student personal information may only transfer to a successor that agrees to be
bound by the commitments in this policy, and we will notify schools before any
such transfer so they can request deletion instead.

**We do not sell personal information, and we do not share it for cross-context
behavioral advertising**, as those terms are defined under California law or any
other US state privacy law.

## 10. The public showcase

A completed project can be published to the ${LEGAL.product} showcase. Each
project has a visibility setting the student chooses:

| Setting | Who can see it |
| --- | --- |
| Private | Only the team |
| Anyone with the link | Only people holding the secret share link. Not listed in the gallery, and not indexed. |
| Public | Anyone, after a teacher reviews and approves it. Listed in the public gallery. |

Some things to understand about publishing:

- **Public means public.** A published project can be viewed, copied, quoted, and
  indexed by search engines by anyone in the world. Treat it as permanent, even
  though you can unpublish it.
- **A teacher must approve** a public project before it appears, and approval is
  bound to the exact version reviewed — editing an approved project returns it to
  pending review.
- **Do not publish personal information.** Do not include your full name if you
  would rather not, and never include another person's name, face, contact
  details, or identifying information without their permission — and, for another
  minor, their parent's permission.
- **We can remove anything.** We may remove or unpublish content at our
  discretion, and a teacher or school may direct us to.
- **Anyone can report** a published project through the report link on the page.
- **We count views** with the salted, non-reversible fingerprint described in
  section 4.3, retained for 90 days.

For a student under 18 using ${LEGAL.product} through a school, public
publication should follow the school's own media-release or directory-information
practice. The teacher approval step exists so that a school is always in the
loop.

## 11. Where data is stored

${LEGAL.product} is operated from the United States, and all of the providers in
[Appendix A](#appendix-a-service-providers) store data in the United States
unless their own documentation says otherwise. If you use ${LEGAL.product} from
outside the United States, your information will be transferred to and processed
in the United States, where privacy laws differ from those in your country.

${LEGAL.product} is intended for use in the United States and is not directed at
individuals in the European Economic Area or the United Kingdom.

## 12. How long we keep data

**Accounts and schoolwork.** We keep your account and work for as long as the
account is active, and afterwards until you, your school, or your parent or
guardian asks us to delete it, or until we delete it under a retention schedule
agreed with your school.

**End of a pilot or school year.** When a school ends its use of
${LEGAL.product}, we will delete or return its student data on request. We ask
schools to tell us what they want done; if a school does not respond, we retain
the data so that a student's work is not destroyed by silence, and we will
follow up.

**Records with a fixed schedule today:**

| Record | Kept for |
| --- | --- |
| Public gallery view fingerprints | 90 days |
| Rate-limit counters | Under one minute |
| Application logs (opaque identifiers only) | Per our hosting provider's retention schedule |
| Error reports | Per our error-tracking provider's retention schedule |

**Records without a fixed schedule yet.** We have built the mechanism to expire
older records automatically — activity feeds, notifications, AI transcripts,
teacher feedback, delivered-email records — but the specific number of days for
each is a decision that belongs with schools and with qualified advice on FERPA
and COPPA, and it has not been finalized. Until it is, the mechanism is set to
**keep** rather than to delete, so that nothing is destroyed by an unreviewed
default. We will publish the schedule in this section once it is set, and we will
treat shortening it as a change we announce in advance under
[section 20](#20-changes-to-this-policy).

**Backups.** Deleted data may persist in encrypted database backups for a limited
period after deletion from the live system, and is overwritten on the normal
backup cycle. Backups are not used to restore deleted accounts.

**After deletion.** Some records survive an account deletion on purpose, and we
want to be exact about which:

- Work a student contributed to a **team** — project logs, the team's discovery
  graph, the synthesis matrix, purchases — stays with the team, because deleting
  one member's contributions would destroy their teammates' project. It is no
  longer linked to a name or an email address.
- The user record itself is **not dropped but emptied**: name, email address, and
  the authentication identifier are overwritten with non-routable placeholders
  and the record is marked deleted. Nothing personal remains readable through it.
- Append-only membership and security logs keep an opaque identifier, which after
  the step above no longer resolves to a person.
- Cost accounting keeps token counts, which contain no content.

## 13. Security

We take the security of children's schoolwork seriously and design for it
deliberately. In practice that means:

- Every database query and change is scoped to the requesting user's own team and
  class, so one team cannot read or modify another team's data.
- Uploaded files are stored in a **private** bucket and served only through an
  access-controlled route — never from a public URL.
- Data is encrypted in transit (HTTPS/TLS) and encrypted at rest by our database
  and storage providers.
- Passwords are handled entirely by our authentication provider; we never see
  them.
- Application logs are written under a redaction policy that keeps names, email
  addresses, and student content out of them.
- Expensive AI routes are rate-limited, spend is metered against a daily
  threshold that raises an alert, and a kill switch can stop all AI calls
  immediately.
- Security-relevant events are recorded and monitored, and we maintain a written
  incident-response runbook.
- Access to production systems is limited to the people who operate the service.

No system is perfectly secure, and we do not claim ${LEGAL.product} is. If we
discover a breach of personal information, we will notify affected schools and
users without unreasonable delay and in accordance with applicable state breach
notification laws, and we will tell you what happened, what data was involved,
and what we are doing about it.

If you believe you have found a security vulnerability, please email
${LEGAL.contactEmail} with the details. We will not pursue legal action against
researchers who report vulnerabilities in good faith, who do not access or modify
other people's data, and who give us a reasonable chance to fix the problem
before disclosing it.

## 14. Your choices and rights

Regardless of where you live, you can ask us to:

- **Access or export** a copy of the personal information we hold about you.
- **Correct** information that is wrong. Names and email addresses can also be
  changed directly in your account settings.
- **Delete** your account and its data.
- **Stop emailing you.** Turn off email notifications in your notification
  preferences, or use the unsubscribe link in any notification email. We will
  still send essential account and security messages.

**How to make a request.** Signed-in users can file an export or deletion request
from within the app. Anyone can email ${LEGAL.contactEmail}. We will acknowledge
the request and complete it within ${LEGAL.requestResponseDays} days, or tell you
why we need longer.

**How we verify you.** We verify a request by confirming control of the account's
email address, and for a school-linked student account by confirming the request
with the school. We ask for no more identifying information than the verification
requires, and we do not use anything you send us for verification for any other
purpose.

**Requests about a minor's school record are approved by the school.** For a
student under 18 who uses ${LEGAL.product} through a school, filing a request in
the app does not by itself erase anything: the request is queued, and an operator
executes it only after the school confirms it. This is deliberate. The authority
to destroy a minor's school record belongs to the school and the parent, not to a
one-click button that a classmate could reach or a student could hit by accident.
For a direct account with no school, the account holder, or their parent or
guardian, is the one who confirms.

**Deletion is permanent and not reversible.** An export is delivered through your
school's agreed channel rather than emailed, because an export bundle is the
single densest collection of personal information the system can produce and
email is not a safe way to move it.

**No retaliation.** We will never degrade your experience, charge you, or treat
you differently for exercising a privacy right.

## 15. Information for parents and guardians

**If your child uses ${LEGAL.product} through a school**, the school has directed
its use, and the school is the right first point of contact. You may ask the
school — or us, and we will coordinate with the school — to:

- review the personal information we hold about your child;
- correct anything inaccurate;
- have it deleted;
- refuse any further collection or use of your child's information, which means
  the account will be closed, since the product cannot run without it.

We will honor a verified request from a school to delete a student's data even if
the student objects, and we will honor a verified parental request routed through
the school.

**If your child signed up directly, without a school**, you can exercise all of
those rights with us at ${LEGAL.contactEmail}. We may ask you to verify that you
are the parent or guardian of the account holder.

**What your child does in ${LEGAL.product}:** reads research papers, takes
quizzes, writes about experiments, chats with an AI study assistant about
scientific papers, builds a virtual lab, and competes in a spell-battle
minigame. There is **no open messaging between students** in ${LEGAL.product} —
no direct messages, no public comments — so the usual stranger-contact risk of a
social app is not present. Students on the same team see each other's shared
project work, and published projects are visible to whoever the visibility
setting allows.

## 16. Information for schools: FERPA, COPPA, and state student-privacy laws

**FERPA.** Where a school uses ${LEGAL.product} to maintain student information,
the school may designate us a "school official" with a "legitimate educational
interest" in the education records we process on its behalf, under 34 CFR
99.31(a)(1). On that basis we commit that we:

- use education records only to provide and improve ${LEGAL.product} for that
  school, and for no other purpose;
- remain under the school's direct control with respect to those records;
- do not re-disclose education records except as this policy describes or the
  school directs;
- correct, export, or delete records on the school's instruction; and
- support the school in responding to a parent's request to inspect and review
  their child's records.

The school remains responsible for compliance with FERPA, including any required
annual notification and any direct-consent requirement its own policies impose.

**COPPA.** For students under 13, we rely on the school to provide consent on
behalf of parents, which COPPA permits when a service is used solely for
school-authorized educational purposes and the school has been given notice of
our collection practices. This policy is that notice. We do not condition a
child's participation on disclosing more information than is reasonably necessary,
we do not use children's personal information for targeted advertising or to
build a non-educational profile, and we delete it on request. A school may
review the child's information and refuse further collection at any time by
contacting ${LEGAL.contactEmail}.

**State student-privacy laws.** Consistent with California's SOPIPA and similar
laws in other states, we commit that we do **not**:

- target advertising to students, on ${LEGAL.product} or anywhere else, using
  information acquired through ${LEGAL.product};
- create a profile of a student except in furtherance of school purposes;
- sell or rent student information;
- disclose student information except as described in section 9.

And that we **do** maintain reasonable security procedures, and delete student
information on the request of the school or district.

**PPRA.** ${LEGAL.product} does not administer surveys about the protected
categories listed in the Protected Pupil Rights Amendment, and does not collect
student information for marketing.

**Written agreements.** A school or district that needs a data privacy agreement,
a state student-data-privacy addendum, or a signed FERPA school-official
designation should contact ${LEGAL.contactEmail}. A signed agreement with a
school controls over this policy where the two differ.

## 17. California residents

This section supplements the rest of the policy for California residents and is
provided under the California Consumer Privacy Act as amended ("CCPA"). Note that
information collected on behalf of a school as part of a student's education
record is generally governed by FERPA and California's student-privacy statutes
rather than the CCPA; we describe rights here for the accounts and situations
where the CCPA does apply.

**Categories of personal information we have collected in the past 12 months:**

| CCPA category | Collected | Examples |
| --- | --- | --- |
| Identifiers | Yes | Name, email address, account identifier, IP address (transiently, for rate limiting) |
| Customer records information | Yes | Name and email address associated with an account |
| Protected classification characteristics | No | — |
| Commercial information | No | ${LEGAL.product} is free and collects no purchase data |
| Internet or network activity | Yes | Application and hosting logs, error reports, feature use |
| Geolocation data | No | No precise location; approximate region may be inferable from an IP address in hosting logs |
| Audio, video, or similar | Yes, if you upload it | Project-log photographs, showcase images, a video link you supply |
| Professional or employment information | Yes, for teachers | Role, school affiliation |
| Education information | Yes | Class and team enrollment, coursework, quiz and assessment results, teacher feedback |
| Inferences | Limited | Proficiency levels and progress computed from your work, used only to run the product |
| Sensitive personal information | No | We do not collect government identifiers, financial accounts, precise geolocation, health, biometric, or account credentials |

**Sources, purposes, and disclosures** are described in sections 4, 6, and 9.

**Sale and sharing.** We have not sold personal information, and we have not
shared it for cross-context behavioral advertising, in the past 12 months, and we
do not do so now. We have not sold or shared the personal information of
consumers under 16.

**Sensitive personal information.** We do not collect sensitive personal
information as the CCPA defines it, so the right to limit its use does not arise.

**Your rights:** to know, to access, to a portable copy, to correct, to delete,
and not to be retaliated against for exercising them. Exercise them as described
in [section 14](#14-your-choices-and-rights). You may use an authorized agent;
we will ask the agent for written authorization and may ask you to confirm it
directly.

**Retention** is described in [section 12](#12-how-long-we-keep-data).

**Shine the Light.** We do not disclose personal information to third parties for
their own direct marketing purposes.

## 18. Other US state privacy rights

Residents of states with comprehensive privacy laws — including Colorado,
Connecticut, Virginia, Utah, Texas, Oregon, Montana, and others as they take
effect — have rights to access, correct, delete, and obtain a copy of their
personal information, and to opt out of targeted advertising, sale, and certain
profiling. **We do not conduct targeted advertising, sale, or profiling that
produces legal or similarly significant effects**, so those opt-outs have nothing
to act on; the access, correction, deletion, and portability rights are the ones
in [section 14](#14-your-choices-and-rights) and we honor them for everyone
regardless of where they live.

If we deny a request you may appeal by replying to our decision; we will respond
to an appeal in writing, and if we deny the appeal we will tell you how to
contact your state attorney general.

## 19. Third-party sites and research content

${LEGAL.product} shows you research papers, patents, abstracts, and plain-language
health explainers retrieved from public sources, and links out to publisher
websites, science-fair organizations, and other third-party sites.

We do not control those sites, they have their own privacy policies, and
following a link takes you outside ${LEGAL.product}. Health information shown in
${LEGAL.product} is general reference material, not medical advice.

## 20. Changes to this policy

We will update this policy as ${LEGAL.product} changes. When we do:

- we update the effective date and version at the top;
- for any **material** change — a new category of data, a new purpose, a new
  category of recipient, or a shorter retention period — we will give notice in
  the app and by email to account holders and to schools **before** the change
  takes effect, with at least 30 days' notice where practical;
- for a school-directed deployment, a material change that would expand how
  student data is used requires the school's agreement, not merely notice; and
- we will never apply a materially different use to information already collected
  without the consent required by law.

Continued use after a change takes effect means you accept the updated policy,
except where consent is required.

## 21. How to contact us

Questions, privacy requests, security reports, and school agreements:

- Email: ${LEGAL.contactEmail}
- Postal: ${LEGAL.entity}, ${LEGAL.address}

Please tell us whether you are a student, parent, teacher, or administrator, and
which school or class the question concerns, so we can route it correctly.

## Appendix A: Service providers

Each provider receives only what its function requires, is bound by a contract
limiting its use of that data to providing services to us, and is prohibited from
selling it. This list is current as of the effective date.

| Provider | Function | What it receives |
| --- | --- | --- |
| Clerk | Authentication and session management | Name, email address, credentials, session data |
| Supabase | PostgreSQL database hosting | All application data described in section 4 |
| Vercel | Application hosting, scheduled jobs | Request data, IP address in platform logs |
| Cloudflare R2 | File storage | Uploaded PDFs, images, and export bundles |
| Anthropic | AI-generated quizzes, explanations, grading, and chat | Student-written text and paper text, without identity — see section 7 |
| Resend | Notification email delivery | Recipient email address and message subject |
| Sentry | Error tracking | Technical error data with opaque identifiers |
| Upstash | Rate-limit counters | An account identifier or IP address, expiring within a minute |
| Firecrawl | Reading public science-fair websites for deadlines | Public URLs only. **No student data.** |

We also query the following public research sources. We send them search terms
and record identifiers, **never a student's identity**: OpenAlex (including
records from PubMed and arXiv), Semantic Scholar, PatentsView, and MedlinePlus.

## Appendix B: Data categories at a glance

| Category | Personal? | Visible to teammates | Visible to teacher | Ever public |
| --- | --- | --- | --- | --- |
| Name, email address | Yes | Name only | Yes | Only if the student publishes it |
| School, class, team | Yes | Yes | Yes | On a published project |
| Uploaded papers and notes | Schoolwork | Yes | Yes | No |
| Quiz and assessment results | Schoolwork | No | Yes | No |
| AI chat transcripts | Schoolwork | No | Yes | No |
| Project logs and photos | Schoolwork | Yes | Yes | Only if published |
| Showcase submission | Schoolwork | Yes | Yes | If set to public and approved |
| Game state and Battle Arena results | Gameplay | Yes | Yes | No — the trophy leaderboard shows team names to the same class only |
| Logs, error reports, counters | Technical | No | No | No |
`
