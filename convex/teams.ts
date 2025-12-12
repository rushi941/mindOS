import { query } from "./_generated/server";
import { v } from "convex/values";
import type { TeamAggregate } from "../src/types";

export const listOrganizations = query(async (ctx) => {
  const orgs = await ctx.db.query("organizations").collect();
  return orgs.map((o) => ({ orgId: o.orgId, orgName: o.orgName }));
});

export const listTeams = query({
  args: { orgId: v.optional(v.string()) },
  handler: async (ctx: any, args: { orgId?: string }) => {
    const queryBuilder = args.orgId
      ? ctx.db.query("teams").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      : ctx.db.query("teams");
    const teams = await queryBuilder.collect();
    return teams.map((t: any) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      orgId: t.orgId,
    }));
  },
});

export const getTeamAggregate = query({
  args: { teamId: v.string() },
  handler: async (ctx: any, args: { teamId: string }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_teamId", (q: any) => q.eq("teamId", args.teamId))
      .first();
    if (!team) {
      throw new Error(`Team ${args.teamId} not found`);
    }
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_orgId", (q: any) => q.eq("orgId", team.orgId))
      .first();
    // Map to TeamAggregate shape, preserving backward compat field "narrative"
    const aggregate: TeamAggregate = {
      teamId: team.teamId,
      teamName: team.teamName,
      orgId: team.orgId,
      orgName: org?.orgName,
      valuesVector: team.valuesVector,
      aggregatedNarrative: team.aggregatedNarrative,
      narrative: team.aggregatedNarrative,
      mindsetScores: team.mindsetScores,
    };
    return aggregate;
  },
});
