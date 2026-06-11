# NOVA Lab — Web ↔ AI Service API Contract

All requests require `X-API-Key: <AI_SERVICE_API_KEY>` header.

Base URL: `AI_SERVICE_URL` (env var in Next.js)

## Endpoints

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|-------------|----------|
| POST | `/papers/process` | Kick off async PDF processing | `{paper_id, file_url, team_topic, lab_type}` | `{status: "queued", paper_id}` |
| POST | `/papers/quiz` | Evaluate quiz response | `{paper_id, question, response}` | `{evaluation, passed}` |
| POST | `/papers/extract-citations` | Extract references from text | `{paper_id, text}` | `{references: [{title, authors, year}]}` |
| GET | `/content/field-dispatch` | Get daily Field Dispatch | `?lab_type=` | `{body, reflection_question, lab_type}` |
| GET | `/content/expertise` | Get Proof of Expertise question | `?lab_type=&clearance_level=` | `{question, clearance_level, lab_type}` |
| POST | `/project-log/evaluate` | Evaluate project log entry | `{log_id, body, artifact_url?, entry_type}` | `{is_specific, follow_up_questions, resilience_bonus_eligible}` |
| POST | `/failure-log/evaluate` | Evaluate failure log entry | `{log_id, prediction, actual_result, hypothesis, next_steps, artifact_url?}` | `{is_specific, follow_up_questions}` |
| POST | `/minigames/generate` | Generate mini-game content | `{building_id, category, lab_type, difficulty}` | `{category, scenario, correct_answer, explanation}` |
| POST | `/video/transcode` | Transcode Showcase video | `{input_url, output_key}` | `{status, output_key}` |
| POST | `/video/thumbnail` | Extract video thumbnail | `{input_url, output_key}` | `{status, thumbnail_key}` |
| GET | `/health` | Health check | — | `{status: "ok"}` |
