interface ProblemForEstimate {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string;
  constraints: string;
}

/**
 * Ask Gemini to estimate a CF-equivalent rating (rounded to nearest 100) for
 * each problem. We prompt one batch at a time to keep the request small.
 *
 * The model is anchored to CF rating semantics: 800 = trivial, 1500 = solid
 * Specialist (div2 C), 2000 = solid Expert (div2 D-E), 2500 = Master (div1 C),
 * 3000+ = legendary (div1 E-F).
 */
export function rateProblemsBatchPrompt(problems: ProblemForEstimate[]): string {
  const items = problems.map((p, i) => ({
    idx: i,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    description: p.description.slice(0, 600),
    constraints: p.constraints.slice(0, 200),
  }));

  return `You are a competitive programming expert calibrated against the Codeforces rating scale.

Rate each problem below with an estimated CF-equivalent rating (round to nearest 100, range 800–3500).

CALIBRATION ANCHORS:
- 800-1100  Newbie/Pupil — single loop, basic conditionals, no algorithm
- 1200-1400 Pupil/early Specialist — sorting, prefix sums, basic two pointers, simple greedy
- 1500-1700 Specialist — div2 C territory: classic DP/graphs, observation-driven greedy
- 1800-2000 Expert — div2 D/E: harder DP states, segment-tree/BIT, careful constructive
- 2100-2300 Candidate Master — div1 B-C: non-obvious reductions, advanced graph/DP
- 2400-2600 Master — div1 C-D: heavy combinatorics/number-theory, polished implementations
- 2700+     IM/GM — div1 E-F: research-level techniques, multiple compounded ideas

USE THE TAGS, the title, and the description to triangulate. Don't trust the LearnHub Easy/Medium/Hard label blindly — those are coarse buckets and CF problems with the same Hard label can range from 1900 to 3500.

PROBLEMS:
${JSON.stringify(items)}

Return STRICT JSON. Output one entry per problem in the same order:
{
  "ratings": [
    { "slug": "string", "rating": 1200, "rationale": "1-line why this number" }
  ]
}`;
}
