export type MindsetScore = {
  mindsetId: string;
  mindsetName: string;
  capacity: number;
  friction: number;
};

export type TeamAggregate = {
  teamId: string;
  teamName: string;
  orgId: string;
  orgName?: string;
  valuesVector: string;
  aggregatedNarrative: string;
  narrative?: string; // backward compatibility alias
  mindsetScores: MindsetScore[];
};

export type ReportRecord = {
  _id: string;
  teamId: string;
  createdAt: number;
  version: string;
  modules: string[];
  markdown: string;
};
