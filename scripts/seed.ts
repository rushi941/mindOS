import { config } from "dotenv";
import { setDefaultResultOrder } from "dns";
import { ConvexHttpClient } from "convex/browser";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

// Load .env first, then .env.local (which will override .env values)
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const ORGS = [
  { orgId: "org-1", orgName: "Northwind Labs" },
  { orgId: "org-2", orgName: "Helix Industries" },
  { orgId: "org-3", orgName: "Nova Collective" },
];

const VALUE_VECTORS = [
  "Bias to action; customer intimacy; radical candor; measure what matters; resilience in adversity.",
  "Craft and quality; build with users; calm focus; default to open; celebrate learning loops.",
  "Operational excellence; service mindset; kindness; reliability; disciplined process ownership.",
  "Learning velocity; safety to experiment; shared accountability; transparency by default.",
  "Strategic clarity; disciplined prioritisation; partnership mindset; evidence-based decisions.",
];

const NARRATIVES = [
  "The team is ambitious with strong execution muscle, experimenting rapidly but feeling tension between short-term targets and longer-term positioning.",
  "A dependable crew with calm focus; they show caution around launch risk which slows velocity but maintain high craft standards.",
  "Service-oriented operators absorbing tool churn, creating fatigue; they remain the cultural glue yet need clearer escalation pathways.",
  "Product-minded collaborators who ideate well but need stronger delivery rhythms and clearer leadership priorities.",
  "Cross-functional group with rising innovation energy, yet role clarity and handoff rituals lag behind ambition.",
];

function randomMindsetScores() {
  const ids = [
    "growth",
    "stability",
    "agility",
    "cohesion",
    "experimentation",
    "resilience",
    "clarity",
  ];
  const names = [
    "Growth",
    "Stability",
    "Agility",
    "Cohesion",
    "Experimentation",
    "Resilience",
    "Clarity",
  ];
  return ids.map((id, idx) => {
    const base = 55 + (idx * 7) % 20;
    return {
      mindsetId: id,
      mindsetName: names[idx],
      capacity: Math.min(95, base + Math.floor(Math.random() * 20)),
      friction: Math.max(15, 30 + Math.floor(Math.random() * 25)),
    };
  });
}

function makeTeams() {
  const teams: any[] = [];
  ORGS.forEach((org) => {
    for (let i = 1; i <= 50; i++) {
      const idx = i % VALUE_VECTORS.length;
      teams.push({
        orgId: org.orgId,
        teamId: `${org.orgId}-team-${i}`,
        teamName: `${org.orgName} Team ${i}`,
        valuesVector: VALUE_VECTORS[idx],
        aggregatedNarrative: NARRATIVES[idx],
        mindsetScores: randomMindsetScores(),
      });
    }
  });
  return teams;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      if (error?.cause?.code === "ETIMEDOUT" || error?.code === "ETIMEDOUT") {
        console.log(`Attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

async function main() {
  setDefaultResultOrder("ipv4first");
  const convexUrl =
    process.env.CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    process.env.CONVEX_DEPLOYMENT;

  if (!convexUrl) {
    console.error("Environment variables found:");
    console.error("CONVEX_URL:", process.env.CONVEX_URL || "(not set)");
    console.error("VITE_CONVEX_URL:", process.env.VITE_CONVEX_URL || "(not set)");
    console.error("CONVEX_DEPLOYMENT:", process.env.CONVEX_DEPLOYMENT || "(not set)");
    throw new Error(
      "Set CONVEX_URL or VITE_CONVEX_URL (or CONVEX_DEPLOYMENT) to your Convex deployment URL.",
    );
  }

  console.log("Seeding Convex at", convexUrl);
  const client = new ConvexHttpClient(convexUrl);
  
  const allTeams = makeTeams();
  console.log(`Seeding ${ORGS.length} organizations and ${allTeams.length} teams...`);
  
  try {
    const result = await retryWithBackoff(
      () =>
        client.mutation("seed:seedAll" as any, {
          orgs: ORGS,
          teams: allTeams,
        }),
      5, // 5 retries
      2000, // Start with 2 second delay
    );
    console.log("Seed complete:", result);
  } catch (error: any) {
    console.error("Seed failed after retries:", error.message);
    console.error(
      "\n⚠️  This appears to be a network connectivity issue.",
      "\nThe Convex endpoint may be blocked by firewall/VPN.",
    );
    
    // Write seed data to file as fallback
    const seedData = {
      orgs: ORGS,
      teams: allTeams,
    };
    const seedFile = resolve(process.cwd(), "seed-data.json");
    writeFileSync(seedFile, JSON.stringify(seedData, null, 2));
    console.log(`\n✅ Seed data written to ${seedFile}`);
    console.log(
      "\nYou can manually import this data via:",
      "\n1. Convex Dashboard → Data → Import",
      `\n2. Or run: npx convex run seed:seedAll --args '${JSON.stringify(seedData)}'`,
      "\n   (if network connectivity improves)",
    );
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
