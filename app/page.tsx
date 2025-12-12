import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useConvex, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { REPORT_MODULES, type ReportModule } from "../config/reportModules";
import type { TeamAggregate } from "../src/types";

const capacityPalette = ["#3b82f6", "#14b8a6", "#8b5cf6"];
const frictionPalette = ["#f97316", "#f43f5e", "#a855f7"];

type ListedTeam = {
  teamId: string;
  teamName: string;
};

export default function MindsetDashboard() {
  const convex = useConvex();
  const orgs = useQuery(api.teams.listOrganizations) as { orgId: string; orgName: string }[] | undefined;
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const teams = useQuery(api.teams.listTeams, selectedOrgId ? { orgId: selectedOrgId } : {}) as ListedTeam[] | undefined;
  const saveReport = useMutation(api.reports.saveReport);
  const [pendingTeamId, setPendingTeamId] = useState<string>("");
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState("");
  const [valuesVector, setValuesVector] = useState("");
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [latestLoading, setLatestLoading] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadTeamSuccess, setLoadTeamSuccess] = useState(false);
  const [saveReportSuccess, setSaveReportSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    REPORT_MODULES.map((m: ReportModule) => m.id),
  );

  const aggregate = useQuery(
    api.teams.getTeamAggregate,
    activeTeamId ? { teamId: activeTeamId } : "skip",
  );

  useEffect(() => {
    if (orgs && orgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgs[0].orgId);
    }
  }, [orgs, selectedOrgId]);

  useEffect(() => {
    if (teams && teams.length > 0) {
      setPendingTeamId(teams[0].teamId);
    } else {
      setPendingTeamId("");
    }
  }, [teams]);

  useEffect(() => {
    // Keep selection aligned with current config order
    setSelectedModuleIds(REPORT_MODULES.map((m) => m.id));
  }, []);

  useEffect(() => {
    if (aggregate) {
      setNarrativeDraft(aggregate.aggregatedNarrative ?? aggregate.narrative ?? "");
      setValuesVector(aggregate.valuesVector);
    }
  }, [aggregate]);

  const teamsForChart = useMemo(() => {
    // Only show the currently selected team
    return aggregate ? [aggregate] : [];
  }, [aggregate]);

  const chartData = useMemo(() => {
    if (!aggregate) return [];
    const mindsets = aggregate.mindsetScores.map(
      (m: TeamAggregate["mindsetScores"][number]) => m.mindsetName,
    );
    return mindsets.map((mindsetName: string) => {
      const row: Record<string, string | number> = { mindset: mindsetName };
      teamsForChart.forEach((team) => {
        const score = team.mindsetScores.find(
          (m) => m.mindsetName === mindsetName,
        );
        row[`capacity-${team.teamId}`] = score?.capacity ?? 0;
        row[`friction-${team.teamId}`] = score?.friction ?? 0;
      });
      return row;
    });
  }, [aggregate, teamsForChart]);

  const handleLoadTeam = async () => {
    if (!pendingTeamId) return;
    setLoadingTeam(true);
    setLoadTeamSuccess(false);
    setReportMarkdown("");
    // Simulate loading for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    setActiveTeamId(pendingTeamId);
    setLoadingTeam(false);
    setLoadTeamSuccess(true);
    setTimeout(() => setLoadTeamSuccess(false), 2000);
  };


  const handleGenerate = async () => {
    if (!activeTeamId || !aggregate) return;
    if (selectedModuleIds.length === 0) {
      setReportMarkdown("Select at least one module before generating.");
      return;
    }
    // Preserve order from REPORT_MODULES (matches sidebar display order)
    const selectedModules: ReportModule[] = REPORT_MODULES.filter((m) =>
      selectedModuleIds.includes(m.id),
    );
    setLoadingReport(true);
    try {
      // Use Convex HTTP endpoint instead of Express server
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL is not set. Please add it to your .env.local file.");
      }
      // Convex HTTP routes are served from .convex.site, not .convex.cloud
      // Convert: https://xxx.convex.cloud -> https://xxx.convex.site
      const httpUrl = convexUrl.replace(/\.convex\.cloud/, ".convex.site").replace(/\/$/, "");
      const apiUrl = `${httpUrl}/api/generate-report`;
      
      console.log("[generate-report] Calling Convex endpoint:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: activeTeamId,
          narrative: narrativeDraft,
          valuesVector,
          team: aggregate,
          modules: selectedModules,
        }),
      });
      
      console.log("[generate-report] Response status:", response.status, response.statusText);
      
      // Clone response for error handling (body can only be read once)
      const responseClone = response.clone();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await responseClone.json();
        } catch (e) {
          // If JSON parsing fails, try text
          try {
            const text = await responseClone.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${text}`);
          } catch (textError) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      setReportMarkdown(result.markdown);

      // Persist report via Convex from the client (browser can reach Convex even if server cannot).
      try {
        await saveReport({
          teamId: activeTeamId,
          version: "v1",
          modules: selectedModules.map((m) => m.id),
          markdown: result.markdown,
        });
        setSaveReportSuccess(true);
        setTimeout(() => setSaveReportSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to save report to Convex", err);
      }
    } catch (error) {
      console.error("Generate error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      setReportMarkdown(`Error: ${errorMsg}\n\nDebugging info:\n- VITE_CONVEX_URL: ${convexUrl || "NOT SET"}\n- Convex URL check: ${convexUrl ? `${convexUrl}/api/health` : "N/A"}\n\nPlease check:\n1. VITE_CONVEX_URL is set in .env.local\n2. Restart dev server after setting env vars\n3. Convex is deployed (npx convex deploy)\n4. OPENAI_API_KEY is set in Convex dashboard\n5. Check browser console (F12) for more details`);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleLoadLatest = async () => {
    if (!activeTeamId) return;
    setLatestLoading(true);
    try {
      const latest = await convex.query(api.reports.getLatestReportForTeam, {
        teamId: activeTeamId,
      });
      if (latest?.markdown) {
        setReportMarkdown(latest.markdown);
      } else {
        setReportMarkdown("No saved report found for this team yet.");
      }
    } finally {
      setLatestLoading(false);
    }
  };

  const copyMarkdown = async () => {
    if (!reportMarkdown) return;
    await navigator.clipboard.writeText(reportMarkdown);
  };


  const toggleModule = (id: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const clearModules = () => setSelectedModuleIds([]);
  const selectAllModules = () => setSelectedModuleIds(REPORT_MODULES.map((m) => m.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md bg-slate-800 border border-slate-700 p-2 text-slate-300 hover:bg-slate-700"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        <aside
          className={`fixed lg:static inset-y-0 left-0 w-72 border-r border-slate-800 bg-slate-900/95 lg:bg-slate-900/60 p-6 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                MindsetOS
              </p>
              <h1 className="text-xl font-semibold text-white">
                Team Reports
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-slate-300">Select organization</label>
            <select
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                setActiveTeamId(null);
                setReportMarkdown("");
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              {orgs?.map((org) => (
                <option key={org.orgId} value={org.orgId}>
                  {org.orgName}
                </option>
              ))}
            </select>
            <label className="text-sm text-slate-300">Select team</label>
            <select
              value={pendingTeamId}
              onChange={(e) => setPendingTeamId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              {teams?.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.teamName}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadTeam}
              disabled={loadingTeam || !pendingTeamId}
              className={`w-full rounded-md px-3 py-2 text-sm font-semibold transition-all ${
                loadTeamSuccess
                  ? "bg-green-500 text-white"
                  : loadingTeam
                    ? "bg-indigo-400 text-white cursor-wait"
                    : "bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {loadingTeam ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : loadTeamSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Loaded!
                </span>
              ) : (
                "Load Team Data"
              )}
            </button>
            <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Modules (select to include)</span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllModules}
                    className="text-indigo-300 hover:text-indigo-200"
                  >
                    All
                  </button>
                  <button
                    onClick={clearModules}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    None
                  </button>
                </div>
              </div>
              <ol className="mt-2 space-y-1 text-slate-300">
                {REPORT_MODULES.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-indigo-500"
                      checked={selectedModuleIds.includes(m.id)}
                      onChange={() => toggleModule(m.id)}
                    />
                    <span
                      className={
                        selectedModuleIds.includes(m.id)
                          ? "font-semibold text-indigo-300"
                          : "text-slate-500 line-through"
                      }
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          {!activeTeamId ? (
            <div className="text-slate-300">
              Select a team to load their aggregate diagnostics.
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Current Organization
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {aggregate?.orgName ?? orgs?.find((o) => o.orgId === selectedOrgId)?.orgName ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Current Team
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {aggregate?.teamName ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Total Teams
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {teams?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    in this organization
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Narrative & Inputs
                    </h3>
                    <span className="text-xs text-slate-400">
                      Editable team narrative
                    </span>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-slate-300">
                      Values vector
                    </p>
                    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                      {valuesVector}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-slate-300">
                      Aggregated narrative (edit before generating)
                    </p>
                    <textarea
                      value={narrativeDraft}
                      onChange={(e) => setNarrativeDraft(e.target.value)}
                      className="h-40 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Visualisation
                    </h3>
                    <div className="text-xs text-slate-400">
                      Mindset scores for selected team
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    {chartData.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        Mindset data loading...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barCategoryGap={18}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1f2937"
                          />
                          <XAxis dataKey="mindset" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <Tooltip contentStyle={{ background: "#0f172a" }} />
                          <Legend />
                          {teamsForChart.map((team, idx) => (
                            <Bar
                              key={`cap-${team.teamId}`}
                              dataKey={`capacity-${team.teamId}`}
                              name={`${team.teamName} Capacity`}
                              fill={capacityPalette[idx % capacityPalette.length]}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                          {teamsForChart.map((team, idx) => (
                            <Bar
                              key={`fric-${team.teamId}`}
                              dataKey={`friction-${team.teamId}`}
                              name={`${team.teamName} Friction`}
                              fill={frictionPalette[idx % frictionPalette.length]}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Report
                    </h3>
                    <p className="text-sm text-slate-400">
                      Generates Markdown using OpenAI + Vercel AI SDK, then
                      persists to Convex.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={loadingReport || !activeTeamId}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                        loadingReport
                          ? "bg-indigo-400 text-white cursor-wait"
                          : "bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      {loadingReport ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        "Generate Report"
                      )}
                    </button>
                    {saveReportSuccess && (
                      <div className="flex items-center gap-2 rounded-md bg-green-500/20 border border-green-500/50 px-3 py-2 text-sm text-green-300">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved to Convex
                      </div>
                    )}
                    <button
                      onClick={handleLoadLatest}
                      disabled={latestLoading || !activeTeamId}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {latestLoading ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Loading...
                        </span>
                      ) : (
                        "Load Saved Report"
                      )}
                    </button>
                    <button
                      onClick={copyMarkdown}
                      disabled={!reportMarkdown}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy Markdown
                    </button>
                  </div>
                </div>
                <div className="mt-4 min-h-[400px] rounded-md border border-slate-800 bg-slate-950/60 p-6 overflow-auto">
                  {loadingReport ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <svg
                        className="animate-spin h-12 w-12 text-indigo-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <p className="text-slate-400">Generating report with AI...</p>
                      <p className="text-xs text-slate-500">This may take a moment</p>
                    </div>
                  ) : reportMarkdown ? (
                    <div className="prose prose-invert prose-slate max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-3xl font-bold text-white mb-4 mt-6 first:mt-0" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-2xl font-semibold text-white mb-3 mt-5" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-slate-300 mb-4 leading-relaxed" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-slate-300" {...props} />
                          ),
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto mb-4">
                              <table className="min-w-full border border-slate-700" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th className="border border-slate-700 bg-slate-800 px-4 py-2 text-left text-slate-200 font-semibold" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="border border-slate-700 px-4 py-2 text-slate-300" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-sm" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-400 my-4" {...props} />
                          ),
                        }}
                      >
                        {reportMarkdown}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <svg
                        className="h-16 w-16 text-slate-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-slate-400 mb-2">No report generated yet</p>
                      <p className="text-xs text-slate-500">
                        Click "Generate Report" to create a team report
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
