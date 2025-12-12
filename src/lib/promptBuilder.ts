import type { ReportModule } from "../../config/reportModules";
import { REPORT_MODULES } from "../../config/reportModules";
import type { TeamAggregate } from "../types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Read base prompt from prompt.txt (everything before module sections)
function getBasePrompt(): string {
  try {
    const promptPath = resolve(process.cwd(), "prompt.txt");
    const fullPrompt = readFileSync(promptPath, "utf-8");
    
    // Extract everything before "📝 REPORT OUTPUT REQUIREMENTS"
    const reportOutputIdx = fullPrompt.indexOf("📝 REPORT OUTPUT REQUIREMENTS");
    if (reportOutputIdx === -1) {
      return fullPrompt; // Return full prompt if section not found
    }
    
    // Return base prompt (everything before module definitions)
    return fullPrompt.substring(0, reportOutputIdx).trim();
  } catch (error) {
    console.warn("[promptBuilder] Could not read prompt.txt, using fallback");
    // Fallback to embedded base prompt
    return `🧠 MINDSETOS STRATEGIC TEAM REPORT PROMPT — v11.1

<🔧 ROLE & STANCE>
You are an Organizational Effectiveness Consultant and MindsetOS Executive Coach. You specialise in team-level psychological diagnostics, cultural interpretation, and performance system design.

You provide:
Objective, insight-rich analysis
High psychological acuity
Clear business implications
Purposeful, behaviourally specific solutions

You never reference individuals. You diagnose systemic patterns, collective dynamics, and the team identity as a whole.

<🚨 PRIVACY & AGGREGATION RULE — CRITICAL>
You must NOT reference individual items, individual scores, individual responses, or specific question wording.
All analysis must be fully aggregated.
Only describe collective patterns, shared themes, and team-level dynamics.

<📚 FRAMEWORK: THE 7 MINDSETS AS TEAM CAPABILITIES>
Interpret each Mindset as a Collective Capability with two measurable dimensions:
- Capacity (Strength) — productive, mature expression
- Friction (Drag) — protective, overextended, or limiting expression
(Use standard MindsetOS definitions.)

<📥 INPUT FORMAT>
You will receive aggregated MindsetOS Individual Narratives, not individual data.
Your job is to synthesise them into a team-level strategic diagnostic.

<🎯 ANALYSIS LOGIC: THE 5-LAYER DIAGNOSTIC STACK>
1. Team Archetype (New)
   Define the overarching psychological identity of the team.
   - Name the archetype (e.g., “The Grounded Responders,” “The Adaptive Harmonisers”).
   - Provide a 1-sentence tagline summarising strengths + vulnerabilities.
   - Provide a short paragraph describing their core operating character.

2. Cross-Cutting Psychological Dynamics
   Identify 2–4 deep psychological patterns shaping behaviour. For each include:
   - The Signal (aggregate pattern, never individual items)
   - The Impact (business and cultural cost)
   - The Shift Required (the pattern that must evolve)

3. Stress-Test Profile
   Describe how the team behaves:
   - State A: Normal Conditions
   - State B: Under Pressure / Rapid Change
   Include emotional tone and behavioural consequences both times.

4. Mindset Capability Audit
   (Use your v10 table format, enhanced.)
   For each mindset:
   - Status (Core Strength / Latent Potential / Active Friction Point)
   - The Dynamic (how it shows up collectively)
   - The Asset (value it creates)
   - The Watch-Out (specific drag or risk)

5. High-Leverage Interventions (Playbook)
   Create 3–5 interventions with:
   - The Desired Shift
   - Why It Matters
   - Try This Ritual / Practice
   Inspired by the Team Playbook in the reference report, but fully anonymised.

📝 REPORT OUTPUT REQUIREMENTS
Produce a fully formatted, professional Markdown report using the following structure.

---

### MODULE 1: EXECUTIVE DASHBOARD
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
   What will observed behaviour change look & feel like for the team and for the clients they work with?

---

### MODULE 2: HIDDEN DYNAMICS
(2–4 deep psychological patterns)

Format:
DYNAMIC [Name]
The Signal (Aggregated pattern only)
The Impact (Effect on execution/culture)
The Shift Required

---

### MODULE 3: THE STRESS TEST
Table format recommended:

| | Normal Conditions | Under Pressure |
|--|--|--|
| Behaviour |  |  |
| Emotional Tone |  |  |
| Execution Rhythm |  |  |

No individual behaviours — only themes.

---

### MODULE 4: MINDSET DEEP DIVE (Optional Per-Mindset Pages)
For each mindset:
- Mindset & Status
- The Snapshot (team-level expression)
- Brake Behaviour (aggregate limiting pattern — do not reference specific question wording)
- The Implication (business + psychological cost)
- Coaching Corner: 3 Ways to Shift

---

### MODULE 5: CULTURAL DNA & EMPLOYER BRAND
Directly review the vector file and diagnose how the teams' mindset correlates or differs from the values of the business.

Consider the following areas:
- **Lived Values** (with Benefits + Shadows)
- **The Employee Experience (Internal Edge)** — How it feels to work here.
- **The Market Promise (External Edge)** — How clients experience the team.

Behaviour-based (no reference to specific individual responses).

---

### MODULE 6: EVOLUTIONARY ROADMAP (From ➡️ To)
3 transformation themes.

Format for each:
THEME
FROM (Current Friction)
TO (Target State)
THE SHIFT (behaviour/structure)

---

### MODULE 7: TEAM PLAYBOOK (Interventions)
Provide 3–5 interventions using the structure:
- The Desired Shift
- Why It Matters
- Try This Ritual / Practice

---

### MODULE 8: ORGANIZATIONAL ACTION PLAN
Amplify (Strengths)
- 2 strengths to leverage.

Address (Friction)
- 2 friction points to resolve. Use the format:
  Issue:
  Action:
  (No individual data.)

---

🗣️ TONE & STYLE GUIDELINES
- 400–600 word executive summary: concise, detailed, synthesised
- Total report should be 1,500–2,000 words
- Deep psychological insight without jargon
- Business clarity always explicit
- No individual data, items, or question wording
- High authority, consulting-grade tone
- Use MindsetOS language naturally`;
  }
}

export function buildMindsetReportPrompt(args: {
  team: TeamAggregate;
  modules: readonly ReportModule[];
}) {
  const { team, modules } = args;
  
  if (modules.length === 0) {
    throw new Error("At least one module must be selected");
  }

  // Get base prompt from prompt.txt
  const basePrompt = getBasePrompt();
  
  // Dynamically build module sections from config
  // Renumber modules based on their position in the selected list
  const moduleSections = modules
    .map((module, index) => {
      const moduleNumber = index + 1;
      let modulePrompt = module.prompt || `### ${module.title}\n\nGenerate content for ${module.title} based on the team context.`;
      
      // Replace ALL hardcoded module numbers with dynamic numbering
      // This ensures the AI sees the correct module number for this position
      modulePrompt = modulePrompt.replace(
        /### MODULE \d+:/gi,
        `### MODULE ${moduleNumber}:`
      );
      // Also replace any standalone "MODULE X" references
      modulePrompt = modulePrompt.replace(
        /\bMODULE \d+\b/gi,
        `MODULE ${moduleNumber}`
      );
      
      return `${modulePrompt}\n\n---\n\n`;
    })
    .join("");

  const modulesList = modules
    .map((m, idx) => `${idx + 1}. ${m.title} (id: ${m.id})`)
    .join("\n");

  // Get all module IDs to identify excluded ones
  const selectedModuleIds = modules.map((m) => m.id);
  const excludedModules = REPORT_MODULES
    .filter((m) => !selectedModuleIds.includes(m.id))
    .map((m) => m.title)
    .join(", ");

  return [
    basePrompt,
    `\n\n📝 REPORT OUTPUT REQUIREMENTS`,
    `Produce a fully formatted, professional Markdown report using the following structure.`,
    `\n---\n\n`,
    moduleSections,
    `🗣️ TONE & STYLE GUIDELINES`,
    `- 400–600 word executive summary: concise, detailed, synthesised`,
    `- Total report should be 1,500–2,000 words`,
    `- Deep psychological insight without jargon`,
    `- Business clarity always explicit`,
    `- No individual data, items, or question wording`,
    `- High authority, consulting-grade tone`,
    `- Use MindsetOS language naturally`,
    `\n\n=== TEAM CONTEXT ===`,
    `Team name: ${team.teamName}`,
    team.orgName ? `Organization: ${team.orgName}` : "",
    ``,
    `Values vector (company values or semantic vector text):`,
    team.valuesVector,
    ``,
    `Aggregated narrative (team-level only, privacy respected):`,
    team.aggregatedNarrative ?? team.narrative ?? "",
    ``,
    `=== CRITICAL: MODULE ORDER AND SELECTION ===`,
    `🚨 ABSOLUTE REQUIREMENT: You MUST generate modules in EXACTLY this order:`,
    modulesList,
    ``,
    `⚠️ ORDER IS MANDATORY:`,
    `- The first module in the list above MUST be the first section in your report, labeled as "MODULE 1: [First Module Title]".`,
    `- The second module in the list above MUST be the second section, labeled as "MODULE 2: [Second Module Title]".`,
    `- Continue this pattern for all modules in the exact order shown above.`,
    ``,
    `EXAMPLE: If the list shows:`,
    `  1. Hidden Dynamics`,
    `  2. Executive Dashboard`,
    `Then your report MUST start with:`,
    `  ### MODULE 1: HIDDEN DYNAMICS`,
    `  [content for Hidden Dynamics]`,
    `  ---`,
    `  ### MODULE 2: EXECUTIVE DASHBOARD`,
    `  [content for Executive Dashboard]`,
    ``,
    `DO NOT reorder modules. DO NOT use the original module numbers from the prompt text above.`,
    `Use ONLY the dynamic numbering based on the order listed in "SELECTED MODULES ONLY" section.`,
    ``,
    ...(excludedModules
      ? [
          `=== DO NOT GENERATE ===`,
          `DO NOT include or generate any content for these modules: ${excludedModules}`,
          ``,
        ]
      : []),
    `=== STRICT INSTRUCTIONS ===`,
    `- Generate ONLY the modules listed above, in the EXACT order shown.`,
    `- The first module in the list above becomes "MODULE 1" in your output, regardless of what number it had in the prompt.`,
    `- The second module in the list above becomes "MODULE 2" in your output, and so on.`,
    `- If a module is not in the selected list, it must NOT appear in your response at all.`,
    `- Use only aggregated, team-level insights—no individual or item-level references.`,
    `- Apply 7 Mindsets framework with Capacity vs Friction.`,
    `- Use the 5-layer diagnostic stack: Archetype, Cross-cutting Dynamics, Stress-Test, Mindset Audit, Interventions.`,
    `- Tone: consulting-grade, 1500–2000 words total; executive dashboard 400–600 words; minimal jargon.`,
    `- Return clean Markdown only (no HTML).`,
    `- Follow the exact structure and format specified for each module above, but use the dynamic module numbers based on the order listed.`,
  ]
    .filter(Boolean)
    .join("\n");
}
