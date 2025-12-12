import { httpAction } from "./_generated/server";
import { REPORT_MODULES, type ReportModule } from "../config/reportModules";
import type { TeamAggregate } from "../src/types";
import { api } from "./_generated/api";

export const generateReport = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { teamId, narrative, valuesVector, team, modules } = body as {
      teamId?: string;
      narrative?: string;
      valuesVector?: string;
      team?: TeamAggregate;
      modules?: ReportModule[];
    };

    if (!teamId || !team) {
      return new Response(
        JSON.stringify({ error: "teamId and team aggregate are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Log API key status
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[generate-report] ⚠️  OPENAI_API_KEY not found");
    } else {
      console.log("[generate-report] ✅ OPENAI_API_KEY loaded");
    }

    const hydratedTeam: TeamAggregate = {
      ...team,
      narrative: narrative ?? team.narrative,
      valuesVector: valuesVector ?? team.valuesVector,
    };

    const modulesToUse = modules && modules.length > 0 ? modules : REPORT_MODULES;

    // Log module order for debugging
    console.log(
      "[generate-report] Module order:",
      modulesToUse.map((m, idx) => `${idx + 1}. ${m.title} (${m.id})`).join(", ")
    );

    // Generate report using Convex action (which can use Node.js APIs and AI SDK)
    const result = await ctx.runAction(api.promptBuilder.generateReportWithAI, {
      team: hydratedTeam,
      modules: modulesToUse,
    });

    return new Response(
      JSON.stringify({ markdown: result.markdown, version: result.version }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("[generate-report] error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate report",
        details: errorMessage 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

export const health = httpAction(async (_ctx, _request) => {
  return new Response(
    JSON.stringify({ status: "ok" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
});
