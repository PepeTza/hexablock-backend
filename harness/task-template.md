# TASK — [short title]

- Issue: #[number]
- Branch: `[type]/[issue]-[short-description]`
- User story / use case / rules: [HUxx, CU-xx, RN-xx]

Read before starting:

- `AGENTS.md`
- `harness/checklists.md`
- [Docs relevant to this task, e.g. `docs/domain-model.md`, `docs/api-contracts.md`]

---

## Gate 1 — Plan (mandatory, before any code)

Answer with the following and then **stop and wait for approval**:

1. **Current state:** what exists today in the files involved, in plain
   language.
2. **Plan:** what you will create or change, file by file.
3. **Design:** which classes, interfaces, patterns or generics are involved
   and why. Explain any concept the team may not know.
4. **Test cases:** the list of tests you will write
   (`should_<result>_when_<condition>`).
5. **Out of scope:** what you will not touch.
6. **Confidence:** a percentage. If it is below 95 %, ask your questions
   instead of presenting a plan.

---

## Task

[Concrete deliverables. List files to create or modify if known.]

---

## Constraints

- Follow every rule in `AGENTS.md`.
- Do not commit without explicit approval. Do not push to `main`.
- [Task-specific constraints.]

---

## After completion

1. Run the "Done" gate in `harness/checklists.md`.
2. Add a row to `harness/phase-log.md`.
3. Add an entry to `AI_USAGE.md` if the AI contribution was significant.
4. Write a short **How it works** summary (5–10 lines, plain language) in the
   PR description, so any teammate can explain it.

Be direct. Do not be verbose.
