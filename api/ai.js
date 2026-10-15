// Vercel serverless function. The API key lives ONLY in the env var GEMINI_API_KEY.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// One system prompt per level: this is how differentiation is achieved.
const LEVELS = {
  1: `You are a patient maths tutor for LEVEL 1 (Foundation). Create ONE area problem.
- Simple everyday context, small whole numbers, centimetres only, very simple words.
- The problem text may include a one-line formula reminder.
- "hints": 3 progressive hints, friendly and direct (1 = gentle nudge, 2 = the formula, 3 = almost the full calculation).
- "steps": 3-4 tiny guided steps, each written as a small question followed by its answer.`,
  2: `You are a maths teacher for LEVEL 2 (Standard). Create ONE grade-level area problem.
- Decimals with one digit (e.g. 4.5) allowed, units cm² or m². Do NOT mention the formula: the student chooses it.
- "hints": 3 short, indirect hints (1 = which measurements matter, 2 = which relationship, 3 = set-up of the expression without the result).
- "steps": 2-3 concise but complete steps.`,
  3: `You are a maths coach for LEVEL 3 (Advanced). Create ONE multi-step, real-world area problem
(for example paving, painting, planting) in which a region is removed from a larger one. Whole numbers, unit m².
- "hints": 3 Socratic QUESTIONS only; never state a formula or a number from the solution.
- "steps": 3-4 steps with reasoning, ending with a sanity check of the result.`,
};

// Which geometry the server asks for, and which dimension keys the model must return.
const KINDS = {
  rectangle: { keys: ['width', 'height'], area: d => d.width * d.height },
  triangle: { keys: ['base', 'height'], area: d => d.base * d.height / 2 },
  circle: { keys: ['radius'], area: d => Math.PI * d.radius ** 2 },
  rect_minus_rect: { keys: ['width', 'height', 'cut_width', 'cut_height'], area: d => d.width * d.height - d.cut_width * d.cut_height },
  triangle_minus_rect: { keys: ['base', 'height', 'cut_width', 'cut_height'], area: d => d.base * d.height / 2 - d.cut_width * d.cut_height },
  circle_minus_circle: { keys: ['radius', 'inner_radius'], area: d => Math.PI * (d.radius ** 2 - d.inner_radius ** 2) },
};
const BASIC = { rectangle: 'rectangle', triangle: 'triangle', circle: 'circle', composite: 'rect_minus_rect' };
const ADVANCED = { rectangle: 'rect_minus_rect', triangle: 'triangle_minus_rect', circle: 'circle_minus_circle', composite: 'rect_minus_rect' };

async function gemini(system, user) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
    }),
  });
  if (!r.ok) throw new Error(`AI service error (${r.status})`);
  const data = await r.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Validates the model output and recomputes the answer with code (never trust the LLM's arithmetic).
function verify(p, kind) {
  const k = KINDS[kind];
  const d = p.dimensions || {};
  if (!k.keys.every(key => Number.isFinite(d[key]) && d[key] > 0)) return null;
  if (!['cm²', 'm²'].includes(p.unit)) return null;
  if (!Array.isArray(p.hints) || p.hints.length < 3 || !Array.isArray(p.steps) || !p.steps.length) return null;
  if (typeof p.problem !== 'string' || !p.problem) return null;
  const answer = Number(k.area(d).toFixed(2));
  if (!(answer > 0)) return null;
  // Reject the problem if the model's own answer disagrees with the recomputed one.
  if (Math.abs(Number(p.correct_answer) - answer) > 0.01) return null;
  return { kind, problem: p.problem, dimensions: d, unit: p.unit, answer, hints: p.hints.slice(0, 3), steps: p.steps };
}

async function generate(level, shape) {
  const kind = (level === 3 ? ADVANCED : BASIC)[shape] || 'rectangle';
  const keys = KINDS[kind].keys.join(', ');
  const user = `Shape type: ${kind}. Random seed for variety: ${Math.floor(Math.random() * 1e6)}.
Return ONLY JSON: {"problem": string, "dimensions": {${keys}: positive numbers}, "unit": "cm²" or "m²", "correct_answer": number (area, 2 decimals; use π=Math.PI for circles), "hints": [3 strings], "steps": [strings]}.
The numbers in the problem text must match "dimensions" exactly. For circles ask to round to 2 decimal places.`;
  for (let i = 0; i < 3; i++) { // up to 2 retries when the math check fails
    const ok = verify(await gemini(LEVELS[level], user), kind);
    if (ok) return ok;
  }
  throw new Error('Could not produce a verified problem. Please try again.');
}

async function explainMistake(level, b) {
  const sys = `You are a kind maths tutor. Level ${level} of 3 (1 = very guided, 3 = Socratic). Explain in 2-3 sentences the likely mistake behind the student's wrong answer.
Level 1: simple words, say clearly what went wrong. Level 2: short and indirect. Level 3: ask a guiding question, do not reveal the final number.
Return ONLY JSON: {"explanation": string}.`;
  const user = `Problem: ${String(b.problem).slice(0, 600)}\nStudent answer: ${Number(b.student)} ${String(b.unit).slice(0, 4)}\nCorrect answer: ${Number(b.answer)}`;
  return gemini(sys, user);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const level = [1, 2, 3].includes(Number(b.level)) ? Number(b.level) : 1;
    if (b.action === 'generate') return res.json(await generate(level, b.shape));
    if (b.action === 'mistake') return res.json(await explainMistake(level, b));
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Server error' });
  }
};
