import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveReport = mutation({
  args: {
    teamId: v.string(),
    version: v.string(),
    modules: v.array(v.string()),
    markdown: v.string(),
  },
  handler: async (
    ctx: any,
    args: { teamId: string; version: string; modules: string[]; markdown: string },
  ) => {
    const createdAt = Date.now();
    await ctx.db.insert("reports", { ...args, createdAt });
    return { createdAt };
  },
});

export const getLatestReportForTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx: any, args: { teamId: string }) => {
    const latest = await ctx.db
      .query("reports")
      .withIndex("by_team_created", (q: any) => q.eq("teamId", args.teamId))
      .order("desc")
      .first();
    return latest ?? null;
  },
});
