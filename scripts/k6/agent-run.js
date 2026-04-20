import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.K6_API_BASE_URL || "https://api.aistartupbuilder.com";
const TOKEN = __ENV.K6_AUTH_TOKEN || "";

export const options = {
  scenarios: {
    agents: {
      executor: "constant-vus",
      vus: 50,
      duration: "3m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const start = http.post(
    `${BASE}/api/v1/ai/runs`,
    JSON.stringify({ prompt: "k6 smoke" }),
    { headers: { ...headers, "Content-Type": "application/json" } }
  );
  check(start, { "run started": (r) => r.status >= 200 && r.status < 300 });
  const runId = start.json("id");
  if (!runId) {
    sleep(1);
    return;
  }
  for (let i = 0; i < 30; i++) {
    const st = http.get(`${BASE}/api/v1/ai/runs/${runId}`, { headers });
    check(st, { "poll ok": (r) => r.status >= 200 && r.status < 500 });
    const status = st.json("status");
    if (status === "succeeded" || status === "failed") {
      break;
    }
    sleep(2);
  }
}
