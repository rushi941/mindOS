export interface ReportModule {
  id: string;
  title: string;
  prompt?: string;
}

export const REPORT_MODULES: ReportModule[] = [
  {
    id: "executiveDashboard",
    title: "Executive Dashboard",
    prompt: `### MODULE 1: EXECUTIVE DASHBOARD
(This section MUST be 500–600 words. It must be concise, detailed, and synthesised.)

This section must reference the vector file, detailing the core values of the business and ensure clear links are made about areas of alignment and areas of friction.

Without needing to follow this exact structure, include:
1. Team Archetype — Name, tagline, and short description.
2. The Top-Level SWOT — Strengths vs. Risks in particular (two concise lists, no individual data).
3. The Primary Tension — Details around the core tension areas that the business should think seriously about resolving, evolving & loosening.
4. Impact Analysis — Describe aggregated effects on:
   - Culture
   - Performance
   - Connection
5. Strategic Directive —
   The single (or short number of) steps that unlocks the most value.
   Add detail around the psychology behind why this is important and what the expected outcome for the business would be if successful.
   What will observed behaviour change look & feel like for the team and for the clients they work with?`,
  },
  {
    id: "hiddenDynamics",
    title: "Hidden Dynamics",
    prompt: `### MODULE 2: HIDDEN DYNAMICS
(2–4 deep psychological patterns)

Format:
DYNAMIC [Name]
The Signal (Aggregated pattern only)
The Impact (Effect on execution/culture)
The Shift Required`,
  },
  {
    id: "stressTest",
    title: "The Stress Test",
    prompt: `### MODULE 3: THE STRESS TEST
Table format recommended:

| | Normal Conditions | Under Pressure |
|--|--|--|
| Behaviour |  |  |
| Emotional Tone |  |  |
| Execution Rhythm |  |  |

No individual behaviours — only themes.`,
  },
  {
    id: "mindsetDeepDive",
    title: "Mindset Deep Dive",
    prompt: `### MODULE 4: MINDSET DEEP DIVE (Optional Per-Mindset Pages)
For each mindset:
- Mindset & Status
- The Snapshot (team-level expression)
- Brake Behaviour (aggregate limiting pattern — do not reference specific question wording)
- The Implication (business + psychological cost)
- Coaching Corner: 3 Ways to Shift`,
  },
  {
    id: "culturalDNA",
    title: "Cultural DNA & Employer Brand",
    prompt: `### MODULE 5: CULTURAL DNA & EMPLOYER BRAND
Directly review the vector file and diagnose how the teams' mindset correlates or differs from the values of the business.

Consider the following areas:
- **Lived Values** (with Benefits + Shadows)
- **The Employee Experience (Internal Edge)** — How it feels to work here.
- **The Market Promise (External Edge)** — How clients experience the team.

Behaviour-based (no reference to specific individual responses).`,
  },
  {
    id: "evolutionaryRoadmap",
    title: "Evolutionary Roadmap",
    prompt: `### MODULE 6: EVOLUTIONARY ROADMAP (From ➡️ To)
3 transformation themes.

Format for each:
THEME
FROM (Current Friction)
TO (Target State)
THE SHIFT (behaviour/structure)`,
  },
  {
    id: "teamPlaybook",
    title: "Team Playbook",
    prompt: `### MODULE 7: TEAM PLAYBOOK (Interventions)
Provide 3–5 interventions using the structure:
- The Desired Shift
- Why It Matters
- Try This Ritual / Practice`,
  },
  {
    id: "organisationalActionPlan",
    title: "Organisational Action Plan",
    prompt: `### MODULE 8: ORGANIZATIONAL ACTION PLAN
Amplify (Strengths)
- 2 strengths to leverage.

Address (Friction)
- 2 friction points to resolve. Use the format:
  Issue:
  Action:
  (No individual data.)`,
  },
];
