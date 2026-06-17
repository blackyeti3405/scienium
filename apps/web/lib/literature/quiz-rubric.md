# Literature Review Quiz — Pedagogy & Grading Rubric

> This file is the single source of truth for how Nova generates and grades the
> Literature Review comprehension quiz. It is loaded verbatim into the model's
> instructions for **both** question generation and grading. Edit the prose here
> to tune rigor, coverage, or tone — no code changes required.
>
> The two numeric knobs (question count, pass threshold) live in
> `lib/literature/quiz.ts` as `QUIZ_QUESTION_COUNT` and `QUIZ_PASS_THRESHOLD`.

## Audience

The student is a strong, motivated **advanced / AP high-school** science-fair
researcher. They are intelligent but not a domain expert. Calibrate technical
depth accordingly: demand real understanding and quantitative reasoning, but do
not require graduate-level jargon or assume prior coursework in the subfield.

## What the quiz is for

To verify the student has genuinely **read and understood this specific paper** —
not skimmed the abstract — and has absorbed transferable knowledge about the
topic and field the paper sits in. Surface-level recall is not proficiency.

## Question design rules

1. **Grounded in this paper.** Every question must be answerable only by someone
   who read the body of *this* paper. Never ask anything answerable from the
   title or abstract alone, or from generic background knowledge.
2. **Free response.** Questions require a written, natural-language answer. Never
   write multiple-choice, true/false, or fill-in-the-blank questions.
3. **Technical and difficult.** Prefer questions that probe reasoning:
   - *Why* did the authors choose this approach/method over an alternative?
   - What does a specific result or number actually imply?
   - What would change if a stated assumption or condition were violated?
   - How should a particular figure, table, or measurement be interpreted?
   - What is the key limitation or trade-off, and why does it matter?
4. **No rigid template.** Do **not** force a hypothesis/methods/results/conclusion
   structure. Many strong papers — especially engineering and systems papers —
   have no formal hypothesis. Ask about whatever the paper actually contains.
5. **One idea per question.** Keep each question focused and clearly worded.

## Coverage weighting

Across the full set of questions, emphasize, in roughly this priority:

1. **Findings** — the actual results, what they show, and their significance.
2. **Relevance** — why this work matters, what problem it addresses, and how a
   student might connect it to their own research.
3. **Methodology** — how the work was done and why those choices were made.

Then ensure **at least one question** tests **broader field / topic knowledge** —
a concept, technique, or piece of domain context a thoughtful reader should now
understand *because* they read this paper (not paper-specific trivia).

## Per-question grading rubric

Score each answer **0–100** against these criteria:

- **Technical accuracy (40%)** — Is the answer factually correct about the paper
  and the topic? Penalize confident wrong statements heavily.
- **Depth of understanding (30%)** — Does the answer show real comprehension and
  reasoning, or just a vague gesture? Reward explaining *why*, not just *what*.
- **Own words (20%)** — The answer should demonstrate understanding in the
  student's own framing. Penalize verbatim or near-verbatim quoting of the
  abstract/paper that doesn't show comprehension.
- **Specificity (10%)** — Reward concrete reference to the paper's actual content
  (methods, numbers, mechanisms). Penalize generic filler that could apply to any
  paper.

### Grading guidance

- A blank, "I don't know," or evasive non-answer scores **0**.
- An answer that is plausible-sounding but not grounded in *this* paper (bluffing)
  scores low — typically **under 30** — even if it's generically reasonable.
- Partial credit is expected and encouraged: a mostly-correct answer that misses a
  nuance might score 70–85.
- Be rigorous but fair. The bar is "a teacher is satisfied this student understood
  it," not "flawless graduate seminar answer."
- For each answer, return the numeric score and a **one-to-two sentence rationale**
  that tells the student specifically what was strong or missing. Address the
  student directly ("You correctly identified… but you missed…").

## Tone

Encouraging but honest. The rationale should help the student learn, not just
judge them. Never reveal the grading key verbatim; teach through the feedback.
