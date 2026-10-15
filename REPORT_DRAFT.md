# Report: AI Math Differentiator (Topic: Area)

**Idea.** One core topic, the area of plane figures, is adapted by an LLM into three levels. The student chooses a level and a shape; the AI writes a fresh problem, hints, a worked solution and, on request, an explanation of the student's mistake.

**Prompts.** The server holds one system prompt per level and asks for JSON only (problem, dimensions, unit, correct_answer, hints, steps).
- *Level 1 Foundation:* everyday context, small whole numbers, cm only, simple words; hints go from a nudge to the formula to almost the full calculation; steps are tiny guided questions.
- *Level 2 Standard:* decimals and cm²/m²; the formula is not given; short indirect hints; concise full solution.
- *Level 3 Advanced:* multi-step real-world task where a region is removed from a larger one; hints are Socratic questions only; the solution ends with a sanity check.
A separate prompt explains mistakes: Level 1 states the error plainly, Level 2 is brief and indirect, Level 3 asks a guiding question without revealing the answer.

**How differentiation is achieved.** Differentiation changes (1) the problem complexity, (2) the scaffolding, (3) the hint style and (4) the solution depth, while the topic stays the same. The colour theme also changes per level.

**Correctness.** LLMs make arithmetic errors, so the model never decides the answer alone. The server recomputes the area from the returned dimensions using standard formulas and rejects any problem where the values differ by more than 0.01, regenerating up to two times. The API key is stored only as a server environment variable.

**Limitations.** Level 3 uses subtraction of regions but not unit conversion or cost, because every answer must stay machine-verifiable.

_Rewrite this in your own words before submitting (course policy)._
