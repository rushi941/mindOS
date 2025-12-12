import { config } from "dotenv";
import { setDefaultResultOrder } from "dns";
import express from "express";
import cors from "cors";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { REPORT_MODULES, type ReportModule } from "../config/reportModules";
import { buildMindsetReportPrompt } from "../src/lib/promptBuilder";
import type { TeamAggregate } from "../src/types";
import { resolve } from "node:path";

// Load .env first, then .env.local (which will override .env values)
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

// Prefer IPv4 to avoid IPv6 timeouts in some environments (best-effort).
setDefaultResultOrder("ipv4first");

// Log API key status (without exposing the key)
if (!process.env.OPENAI_API_KEY) {
  console.warn("[server] ⚠️  OPENAI_API_KEY not found in environment variables");
} else {
  console.log("[server] ✅ OPENAI_API_KEY loaded");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 8788;
app.post("/api/generate-report", async (req, res) => {
  const { teamId, narrative, valuesVector, team, modules } = req.body as {
    teamId?: string;
    narrative?: string;
    valuesVector?: string;
    team?: TeamAggregate;
    modules?: ReportModule[];
  };
  if (!teamId || !team) {
    return res.status(400).json({ error: "teamId and team aggregate are required" });
  }

  try {
    const hydratedTeam: TeamAggregate = {
      ...team,
      narrative: narrative ?? team.narrative,
      valuesVector: valuesVector ?? team.valuesVector,
    };

    const modulesToUse = modules && modules.length > 0 ? modules : REPORT_MODULES;
    
    // Log module order for debugging
    console.log("[generate-report] Module order:", modulesToUse.map((m, idx) => `${idx + 1}. ${m.title} (${m.id})`).join(", "));
    
    const prompt = buildMindsetReportPrompt({
      team: hydratedTeam,
      modules: modulesToUse,
    });

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });

    const markdown = text;

    res.json({ markdown, version: "v1" });
  } catch (error) {
    console.error("[generate-report] error", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
