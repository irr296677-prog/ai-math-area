# AI Math Differentiator: Area

A web app where an LLM (Google Gemini) turns one topic, **area**, into three difficulty levels with level-specific problems, hints, solutions and mistake explanations.

## Features
- Level 1 Foundation: small numbers, formula reminder, direct hints, guided mini-steps.
- Level 2 Standard: decimals, cm²/m², student picks the formula, indirect hints.
- Level 3 Advanced: multi-step real-world problems (region removed from a larger one), Socratic hints, solution ends with a sanity check.
- Shapes: rectangle, triangle, circle, composite. SVG diagram drawn from the verified dimensions.
- "Explain my mistake": AI analyses the wrong answer at the chosen level.

## Architecture
```
index.html   front-end (no API key inside)
api/ai.js    Vercel serverless function: level prompts, Gemini call, math verification
```
**Math safety:** the model returns the dimensions and its answer; the server recomputes the area with code (A=ab, A=½bh, A=πr², and subtractions). If the two values differ by more than 0.01, the problem is rejected and regenerated (up to 2 retries).

## Setup
1. Get a free key at https://aistudio.google.com/apikey
2. Push this folder to a public GitHub repository.
3. Import the repo in Vercel, then add the environment variable `GEMINI_API_KEY` (optional: `GEMINI_MODEL`, default `gemini-2.5-flash`).
4. Deploy. Local test: `npx vercel dev` with the key in a `.env.local` file (never commit it).

## Screenshots
_Add screenshots of the three levels here._
