import { httpRouter } from "convex/server";
import { generateReport, health } from "./generateReport";

const http = httpRouter();

// Register routes
http.route({
  path: "/api/health",
  method: "GET",
  handler: health,
});

http.route({
  path: "/api/generate-report",
  method: "OPTIONS",
  handler: generateReport,
});

http.route({
  path: "/api/generate-report",
  method: "POST",
  handler: generateReport,
});

export default http;
