import { LEGAL } from './shared'

/**
 * The Terms of Service, as markdown. Rendered by `components/legal/LegalDocument`.
 *
 * Deliberately NOT included, and why — each is a live decision for counsel, not
 * an omission (see `docs/legal/REVIEW-NOTES.md`):
 *
 *  - No binding arbitration or class-action waiver. Enforcing one against a
 *    minor is contested in most states, and a school district's procurement
 *    review routinely rejects it. Informal resolution plus a named forum is the
 *    safer interim posture.
 *  - No indemnity demanded from students. An indemnity from a 15-year-old is
 *    unenforceable and reads as bad faith to the school evaluating the product.
 *    The clause here binds schools and adult account holders only.
 *  - No claim of ownership over student work. Schools reject that outright, and
 *    it is not needed to run the product.
 */
export const TERMS_OF_SERVICE_MD = `
**Effective ${LEGAL.effectiveDate}** — Version ${LEGAL.version}

These Terms of Service ("Terms") are an agreement between you and me. I am
${LEGAL.entity}, and I operate ${LEGAL.product}, the science-research game and
classroom tool at ${LEGAL.site} (the "Service"), as an individual — there is no
company behind it. In these Terms "we", "us", and "our" mean me.

Please read them. They cover what you may and may not do, who owns the work you
create, what we promise, and what we do not.

**By creating an account or using the Service, you agree to these Terms.** If you
do not agree, do not use the Service.

## The short version

- ${LEGAL.product} is **free** right now and is **pre-release software**. Things
  will change, and features may break.
- **You keep ownership of everything you create.** We do not claim your research,
  your writing, or your project. We only get the permission we need to run the
  product for you.
- Use it for schoolwork. Do not harass anyone, do not upload other people's
  personal information, and do not try to break the AI or the cost limits.
- **The AI can be wrong.** It is a study aid. It is not your teacher, not a
  doctor, and not a science-fair rulebook.
- **Real-world experiments are your school's responsibility, not ours.** Nothing
  in ${LEGAL.product} is a safety review.
- Knowledge points, buildings, and trophies are game state. They have no cash
  value and cannot be bought, sold, or redeemed.

## Contents

1. [Who may use the Service](#1-who-may-use-the-service)
2. [Accounts, classes, and teams](#2-accounts-classes-and-teams)
3. [Schools and teachers](#3-schools-and-teachers)
4. [Pre-release software](#4-pre-release-software)
5. [Fees](#5-fees)
6. [Acceptable use](#6-acceptable-use)
7. [Your content and who owns it](#7-your-content-and-who-owns-it)
8. [Uploading other people's material](#8-uploading-other-peoples-material)
9. [Copyright complaints](#9-copyright-complaints)
10. [Publishing to the showcase](#10-publishing-to-the-showcase)
11. [AI-generated content](#11-ai-generated-content)
12. [Academic integrity and science-fair rules](#12-academic-integrity-and-science-fair-rules)
13. [Real-world experiments and safety](#13-real-world-experiments-and-safety)
14. [The Battle Arena and virtual items](#14-the-battle-arena-and-virtual-items)
15. [Our intellectual property](#15-our-intellectual-property)
16. [Third-party content and services](#16-third-party-content-and-services)
17. [Privacy](#17-privacy)
18. [Suspension and termination](#18-suspension-and-termination)
19. [Disclaimers](#19-disclaimers)
20. [Limitation of liability](#20-limitation-of-liability)
21. [Indemnification](#21-indemnification)
22. [Disputes and governing law](#22-disputes-and-governing-law)
23. [Changes to these Terms](#23-changes-to-these-terms)
24. [General terms](#24-general-terms)
25. [Contact](#25-contact)

## 1. Who may use the Service

**You must be at least ${LEGAL.minimumAge} years old** to create an account on
your own.

**If you are under 18**, you may use the Service only with the involvement of
your school or the permission of a parent or legal guardian, and that parent,
guardian, or school agrees to these Terms with you and on your behalf. If you are
a parent or guardian and you do not agree, tell your child not to use the Service
and email us at ${LEGAL.contactEmail} to close the account.

**Children under ${LEGAL.minimumAge}** may use the Service only through a school
that has enrolled them and has provided consent on behalf of parents as described
in our Privacy Policy. We do not knowingly permit a child under
${LEGAL.minimumAge} to sign up without a school, and we will close such an
account when we learn of it.

You may not use the Service if we have previously suspended or removed you, or if
doing so would violate US export control or sanctions law.

## 2. Accounts, classes, and teams

**Accurate information.** Give us a real name and a working email address. Do not
impersonate another person, another student, or a teacher.

**Your account is yours alone.** Do not share your password. Do not sign in as
someone else, and do not let anyone else sign in as you — including a teammate
"just to fix something". You are responsible for what happens under your account.
Tell us at ${LEGAL.contactEmail} if you think someone else has access to it.

**Class join codes.** A class code is for the students in that class. Do not post
it publicly or share it outside the class. A teacher can regenerate a code to
revoke a leaked one, and codes expire.

**Teams.** Teams share work: a project log written by one member is visible to
the rest of the team, and lab resources are shared. Joining a team means agreeing
to that. If you leave a team, the work you contributed to the team's project
stays with the team, because it is the team's project too. Team leads have
additional powers over the team, including removing members, and they must use
them for the project, not to settle arguments.

**One role.** A student account cannot be converted into a teacher account. If
you need a teacher account, create one.

## 3. Schools and teachers

If you accept these Terms on behalf of a school, district, or other
organization, you represent that you are authorized to bind it, and "you" in
these Terms means that organization as well as you personally.

A school or teacher who uses the Service with students agrees that it will:

- provide any notice to parents, and obtain any consent, that its own policies
  and applicable law require before students use the Service;
- supervise students' use, including any real-world experimentation, in
  accordance with its own safety policies;
- review student submissions before approving them for public publication; and
- keep class join codes confined to the intended class.

A teacher can see the work, progress, and submissions of students in their own
class, and no others. A school may direct us to export or delete the data of its
students, and we will act on a verified instruction from the school even over a
student's objection.

If we have signed a separate written agreement with a school or district, that
agreement controls where it conflicts with these Terms.

## 4. Pre-release software

${LEGAL.product} is under active development and is offered for classroom pilots.
That means, honestly:

- Features will change, move, and sometimes be removed.
- There may be bugs, downtime, and errors in generated content.
- We may need to reset, migrate, or rebuild game state — knowledge points,
  buildings, trophies — as the game is balanced. **We will not intentionally
  destroy your research work, writing, or project data to rebalance the game**,
  and we will give notice before any reset that affects saved work.
- We do not promise any particular uptime, and we may suspend the Service for
  maintenance.

Please export anything you cannot afford to lose, and keep your own copy of work
that a science fair depends on.

## 5. Fees

The Service is **free** today. There are no charges, no subscriptions, and we
collect no payment information.

We may introduce paid plans in the future. If we do:

- existing free features will not become paid without at least 30 days' notice;
- no charge will ever be applied retroactively;
- no one will be charged without first agreeing to a separate order or plan; and
- schools will be given the option to end their use and export their data rather
  than pay.

## 6. Acceptable use

Use the Service for learning and research. Do not do any of the following.

**Toward other people**

- Harass, bully, threaten, demean, or target another student, teacher, or person.
- Post hateful content, or content that attacks people on the basis of race,
  ethnicity, national origin, religion, disability, sex, gender identity, or
  sexual orientation.
- Post sexual content, graphic violence, or content promoting self-harm, eating
  disorders, or substance abuse.
- Publish another person's personal information — full name, face, address,
  school, contact details, or anything else identifying — without their
  permission, and, for another minor, without their parent's permission.
- Impersonate anyone.

**Toward the Service**

- Access another team's, class's, or school's data, or try to.
- Use another person's account, or let anyone use yours.
- Probe, scan, or test the security of the Service, except to report a
  vulnerability in good faith as described in our Privacy Policy.
- Circumvent rate limits, spend caps, phase gates, cooldowns, or any other
  control — including by scripting, automating, or running multiple accounts.
- Scrape the Service, or use bots, crawlers, or automated clients against it.
- Deliberately generate expensive AI activity, or run activity whose purpose is
  to increase our costs rather than to learn.
- Attempt to make the AI ignore its instructions, produce prohibited content, or
  reveal system prompts or other users' data.
- Reverse engineer, decompile, or attempt to extract source code, except where
  that restriction is unenforceable by law.
- Resell, sublicense, or offer the Service to third parties as your own.
- Introduce malware, or upload a file designed to exploit a system.
- Interfere with anyone else's use of the Service.

**Around schoolwork**

- Falsify experimental data, or present fabricated results as real.
- Submit AI-generated work as your own where your school or a competition
  forbids it (see [section 12](#12-academic-integrity-and-science-fair-rules)).
- Upload content describing dangerous procedures — explosives, weapons,
  hazardous synthesis, or illegal activity — or use the Service to plan them.

We may investigate suspected violations, remove content, and suspend accounts.
Serious violations by a student will be reported to their teacher or school.

## 7. Your content and who owns it

**You own your work.** Research plans, notes, project logs, datasets, writing,
photographs, showcase submissions — everything you create in the Service ("Your
Content") remains yours. Where a school's policy gives the school rights in
student work, that arrangement is between you and your school; we do not claim
ownership either way.

**The permission you give us.** To run the Service, we need a limited license.
You grant us a non-exclusive, worldwide, royalty-free license to host, store,
copy, transmit, display, reformat, and create technical derivatives of Your
Content **solely in order to operate, secure, support, and improve the Service
for you, your team, your class, and your school**. This license exists for
technical reasons — storing a file, showing it to your teammates, generating a
thumbnail, sending text to our AI provider so a quiz can be made — and for
nothing else.

**It ends when your content does.** The license terminates when you delete Your
Content or your account, except for: (a) content you published publicly, which
others may already have copied; (b) work you contributed to a team's shared
project, which stays with the team as described in our Privacy Policy; and (c)
copies in backups until they age out on the normal cycle.

**Publishing is a separate, wider permission.** If you set a project to public
and a teacher approves it, you additionally grant us the right to display it in
the public gallery and to allow the public to view it. See
[section 10](#10-publishing-to-the-showcase).

**We do not use Your Content to train AI models**, and we do not license it to
anyone who does.

**Feedback.** If you send us ideas or suggestions about the Service, we may use
them freely and without owing you anything. Do not send us anything confidential
as feedback.

**We do not have to keep your content.** We are not a backup service. Keep your
own copies.

## 8. Uploading other people's material

You are responsible for what you upload. By uploading anything, you confirm that:

- you have the right to upload it and to grant the license in section 7;
- it does not infringe anyone's copyright, trademark, or other rights;
- it does not contain another person's personal information without their
  permission, and for another minor, without their parent's permission; and
- any photograph of a person was taken and uploaded with that person's
  permission, and if they are a minor, their parent's.

**About research papers.** ${LEGAL.product} lets you upload PDFs of papers so you
can study them. Uploading a paper you obtained lawfully, for your own study, in a
private team workspace, is the intended use. **Do not upload a paper you do not
have lawful access to**, do not upload paywalled material you obtained
improperly, and do not publish a paper's full text to the public gallery. If a
rights holder asks us to remove material, we will.

## 9. Copyright complaints

If you believe material on the Service infringes your copyright, send a notice to
${LEGAL.contactEmail} (subject line: DMCA) containing:

1. your physical or electronic signature;
2. identification of the copyrighted work you claim is infringed;
3. identification of the material you claim is infringing, with enough detail for
   us to find it (a URL is best);
4. your address, telephone number, and email address;
5. a statement that you have a good-faith belief the use is not authorized by the
   copyright owner, its agent, or the law; and
6. a statement, under penalty of perjury, that the information in the notice is
   accurate and that you are the owner or authorized to act on the owner's
   behalf.

We will remove or disable material in response to a valid notice, and we will
notify the person who posted it, who may send a counter-notice. We terminate the
accounts of repeat infringers.

## 10. Publishing to the showcase

The showcase lets a team publish its project. Three things to understand:

**A teacher approves it.** A project set to "public" is submitted for review and
appears in the gallery only after a teacher of the class approves that exact
version. Editing an approved project sends it back for review.

**Public is public and effectively permanent.** Once a project is public, anyone
can view it, quote it, screenshot it, and search engines may index it.
Unpublishing removes it from our gallery; it does not recall copies other people
already made.

**We can take it down.** We may remove, unpublish, or refuse to publish any
project, with or without a report, at our discretion — including for a violation
of section 6, a copyright complaint, a privacy concern, a safety concern, or a
request from the student's school. We will tell the team when we do, unless the
law prevents us.

Anyone may report a published project using the report link on its page.

## 11. AI-generated content

Parts of the Service generate content with a large language model: quizzes,
explanations of sources, grading and feedback on explain-back answers, relevance
checks, and the in-app AI assistant.

**It can be wrong.** Generated content may be inaccurate, incomplete,
out-of-date, biased, or confidently mistaken about a paper you can read
yourself. Grades and scores it produces are approximations, not authoritative
assessments.

**It is not advice.** Nothing generated by the Service is medical, legal,
psychological, financial, or safety advice. Health information in the Service is
general reference material. If you have a medical question, ask a doctor.

**Verify before you rely on it.** Read the paper. Ask your teacher. Check the
rulebook. Do not cite an AI summary as if it were the source.

**We are not responsible for decisions you make based on generated content**, to
the fullest extent the law allows.

**Ownership.** As between you and us, we do not claim ownership of the output
generated for you. Similar or identical output may be generated for other users,
and generated output may not be protectable by copyright.

**Do not put sensitive information into it.** Not yours, not anyone else's.

## 12. Academic integrity and science-fair rules

${LEGAL.product} is a study tool, and using a tool is not the same as letting it
do your work.

- **Your school's academic-integrity policy governs.** If your teacher says AI
  assistance is not allowed on an assignment, this Service does not override
  that.
- **Science-fair rules are your responsibility.** Competitions such as ISEF and
  its affiliated fairs have their own rules about AI use, human and vertebrate
  subjects, hazardous materials, required forms, and approvals. Any guidance,
  deadline, form list, or checklist shown in ${LEGAL.product} is **informational
  and may be incomplete or out of date**. Always use the official rules from the
  competition itself. We are not affiliated with, endorsed by, or acting for any
  science-fair organization.
- **Do not fabricate data.** Do not present generated or invented results as
  experimental findings.

Disqualification from a competition, a failing grade, or an academic-integrity
finding is between you, your school, and the competition — not something we can
be responsible for.

## 13. Real-world experiments and safety

${LEGAL.product} helps students plan and document research. **Actual
experimentation happens in the physical world, under the supervision of a school,
a teacher, and where required an institutional or scientific review committee.**

- Nothing in the Service is a safety review, a risk assessment, an approval, or a
  substitute for adult supervision.
- Do not attempt any procedure that is hazardous, that requires equipment or
  training you do not have, or that your school has not approved.
- The Service is not designed to evaluate or approve research involving human
  subjects, vertebrate animals, hazardous biological agents, controlled
  substances, or hazardous chemicals. Those require review by qualified people
  under the rules that apply to you.
- If you are ever unsure whether something is safe, stop and ask a teacher.

**We are not responsible for injury, damage, or harm arising from physical
experimentation**, to the fullest extent the law allows. Schools and teachers
retain full responsibility for supervising students.

## 14. The Battle Arena and virtual items

Knowledge points, currency, buildings, spells, trophies, leaderboard positions,
and every other in-game item are a **limited, revocable, non-transferable license
to use game state within the Service**. They are not property, they have **no
monetary value**, and:

- they cannot be purchased with real money today, and cannot be sold, traded,
  transferred, or redeemed for anything of value;
- selling or trading accounts or items outside the Service is prohibited;
- we may adjust, rebalance, reset, or remove them as we develop the game; and
- when your account ends, they end with it, and you are owed nothing for them.

The Battle Arena matches teams within the same class. Play it as a game. Using it
to harass classmates is a violation of section 6.

## 15. Our intellectual property

The Service — its software, design, pixel art, sprites, the Field Codex lessons
and other written curriculum, the name ${LEGAL.product}, and its logos — is owned
by me or my licensors and is protected by copyright, trademark, and other laws.
Where contributors have worked on ${LEGAL.product}, their contributions are
licensed to me for this purpose.

We grant you a limited, personal, non-exclusive, non-transferable, revocable
license to use the Service for its intended educational purpose while these Terms
are in force. Everything not expressly granted is reserved. In particular, you
may not copy, modify, distribute, sell, or lease any part of the Service or its
content, or use our name or logos, without our written permission.

Teachers and schools may use the Service's content for classroom instruction with
their own students.

## 16. Third-party content and services

The Service displays research papers, abstracts, citation data, patent records,
and health explainers from public sources, and links to third-party websites.

That material belongs to its own authors and publishers, is subject to its own
terms and licenses, and we make no representation about its accuracy,
completeness, or availability. We are not responsible for third-party sites you
reach through the Service. Availability of any third-party source may change or
end without notice.

## 17. Privacy

Our [Privacy Policy](/privacy) explains what we collect and why, and is part of
these Terms. Please read it — especially the sections on children, schools, and
what happens to student writing sent to our AI provider.

## 18. Suspension and termination

**You** may stop using the Service at any time and may request deletion of your
account as described in the Privacy Policy.

**We** may suspend or terminate an account, or restrict access to any feature, if
we reasonably believe you have violated these Terms, if your account creates a
security or cost risk, if a school or parent asks us to, or if we are required to
by law. Where the situation allows, we will warn you first and give you a chance
to fix it; for serious violations, including anything that endangers another
student, we may act immediately.

**We may discontinue the Service.** If we shut it down or end a school's pilot,
we will give reasonable advance notice and a window to export work before data is
deleted.

**On termination:** your license to use the Service ends; your right to publish
ends; and sections 7 (the surviving licenses), 8, 15, 17, 19, 20, 21, 22, and 24
survive.

## 19. Disclaimers

**The Service is provided "as is" and "as available", without warranties of any
kind.** To the fullest extent permitted by law, we disclaim all warranties,
express, implied, or statutory, including any implied warranty of
merchantability, fitness for a particular purpose, title, non-infringement, and
any warranty arising from course of dealing or usage of trade.

Without limiting that, we do not warrant that: the Service will be uninterrupted,
timely, secure, or error-free; generated content will be accurate; results will
meet your expectations; defects will be corrected; or that data will not be lost.

**We are not an educational institution, an accreditation body, a science-fair
organization, a medical provider, or a laboratory safety authority, and nothing
in the Service should be treated as coming from one.**

Some states do not allow the exclusion of certain warranties. In those states,
the exclusions above apply only to the extent permitted, and you may have rights
that these Terms cannot limit.

## 20. Limitation of liability

To the fullest extent permitted by law:

**No indirect damages.** Neither I nor anyone who contributes to or supplies the
Service will be liable for any indirect, incidental, special, consequential,
exemplary, or punitive damages, or for lost profits, lost data, lost work, loss
of goodwill, or business interruption, arising out of or related to the Service —
even if we were advised such damages were possible.

**Cap.** My total liability for all claims relating to the Service will not
exceed the greater of (a) the total amount you paid me for the Service in the
twelve months before the event giving rise to the claim, or (b) one hundred US
dollars ($100).

**What is not limited.** Nothing in these Terms limits or excludes liability that
cannot be limited or excluded by law, including liability for fraud, for
fraudulent misrepresentation, for gross negligence or willful misconduct, or for
death or personal injury caused by our negligence. These limits do not apply to
our obligations under our Privacy Policy regarding student data.

**Allocation of risk.** The disclaimers and limits in sections 19 and 20 are a
fundamental part of the agreement between us and reflect that the Service is
currently provided free of charge. They apply even if a limited remedy fails of
its essential purpose.

Some states do not allow certain limitations of liability. In those states, the
limits above apply only to the extent permitted.

## 21. Indemnification

**This section does not apply to students under 18.**

If you are an adult account holder, a school, a district, or another
organization, you agree to defend, indemnify, and hold harmless me and anyone who
contributes to the Service from any claim, damage, loss,
liability, or expense (including reasonable legal fees) arising from: (a) your
violation of these Terms; (b) content you upload or publish; (c) your violation
of any law or of anyone's rights; and, for schools, (d) a failure to obtain a
consent or provide a notice that applicable law or your own policy required
before students used the Service, and (e) the supervision of physical
experimentation by your students.

We will notify you of any claim, let you control the defense with counsel
reasonable to us, and cooperate with you at your expense. You may not settle any
claim in a way that imposes an obligation on us without our written consent.

## 22. Disputes and governing law

**Talk to us first.** If you have a problem, email ${LEGAL.contactEmail} and
describe it. Most disputes can be resolved this way, and we ask that you give us
30 days to try before starting a formal proceeding. We will do the same before
starting one against you.

**Governing law.** These Terms and any dispute arising from them are governed by
the laws of the State of ${LEGAL.governingState}, without regard to its
conflict-of-laws rules, except that the Federal Arbitration Act and federal
copyright and trademark law govern where they apply. The United Nations
Convention on Contracts for the International Sale of Goods does not apply.

**Where disputes are heard.** The state and federal courts located in
${LEGAL.governingCounty} County, ${LEGAL.governingState} have exclusive
jurisdiction, and you and we consent to personal jurisdiction there. Nothing
prevents either of us from seeking injunctive relief in any court of competent
jurisdiction to protect intellectual property or data.

**These Terms do not require arbitration and do not waive any right to
participate in a class action.**

**Time limit.** Any claim relating to the Service must be brought within one year
after it arises, or it is permanently barred, except where a longer period is
required by law — including any claim by or on behalf of a minor, for which the
period allowed by law applies.

**Public entities.** If you are a US public school district or other government
entity, provisions of these Terms that conflict with the law governing you —
including governing law, venue, and indemnity — apply only to the extent that law
permits.

## 23. Changes to these Terms

We may update these Terms. When we do, we will change the effective date and
version above and post the new version at ${LEGAL.site}/terms.

For a **material** change, we will give notice in the app and by email at least
30 days before it takes effect where practical. Changes apply going forward, not
retroactively. If you do not agree to a change, stop using the Service and close
your account before it takes effect; continued use after that date means you
accept the updated Terms.

We will keep prior versions available on request at ${LEGAL.contactEmail}.

## 24. General terms

**Entire agreement.** These Terms and the Privacy Policy are the entire agreement
between you and us about the Service, and replace any earlier understanding —
except for a separate signed agreement with a school or district, which controls
where it conflicts.

**Severability.** If any provision is held unenforceable, it is modified to the
minimum extent necessary or severed, and the rest stays in force.

**No waiver.** If we do not enforce a provision, that is not a waiver of it.

**Assignment.** You may not assign these Terms without our written consent. I may
assign them to a company I form to operate ${LEGAL.product}, or to someone who
acquires it, subject to the student-data commitments in our Privacy Policy.

**No third-party beneficiaries**, except that a school on whose behalf an
authorized representative accepted these Terms may enforce sections 3, 17, and
18.

**Force majeure.** Neither party is liable for a failure to perform caused by
events beyond its reasonable control, including outages of the third-party
providers the Service depends on.

**Notices.** We may notify you in the app, or by email to your account address.
You may notify us at ${LEGAL.contactEmail} and at ${LEGAL.entity},
${LEGAL.address}.

**Export and sanctions.** You confirm that you are not located in, and are not
acting on behalf of anyone in, a country or on a list subject to US embargo or
sanctions.

**Relationship.** Nothing here creates a partnership, joint venture, employment,
or agency relationship.

**Headings** are for convenience and do not affect interpretation. "Including"
means "including without limitation".

## 25. Contact

- Email: ${LEGAL.contactEmail}
- Postal: ${LEGAL.entity}, ${LEGAL.address}
`
