import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    teamId: v.string(),
    createdAt: v.number(),
    version: v.string(),
    modules: v.array(v.string()),
    markdown: v.string(),
  }).index("by_team_created", ["teamId", "createdAt"]),
  teams: defineTable({
    orgId: v.optional(v.string()),
    teamId: v.string(),
    teamName: v.string(),
    valuesVector: v.optional(v.string()),
    aggregatedNarrative: v.optional(v.string()),
    mindsetScores: v.optional(
      v.array(
      v.object({
        mindsetId: v.string(),
        mindsetName: v.string(),
        capacity: v.number(),
        friction: v.number(),
        }),
      ),
    ),
  })
    .index("by_teamId", ["teamId"])
    .index("by_org", ["orgId", "teamId"]),
  organizations: defineTable({
    orgId: v.string(),
    orgName: v.string(),
  }).index("by_orgId", ["orgId"]),
});
