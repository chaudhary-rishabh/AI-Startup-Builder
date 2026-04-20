import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.K6_API_BASE_URL || "https://api.aistartupbuilder.com";
const TOKEN = __ENV.K6_AUTH_TOKEN || "";

export const options = {
  scenarios: {
    sse: {
      executor: "constant-vus",
      vus: 30,
      duration: "3m",
    },
  },
  thresholds: {
    checks: ["rate>0.95"],
  },
};

function parseSseDone(body) {
  if (!body) return false;
  return body.includes("event: done") || body.includes('"done"');
}

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "text/event-stream",
  };
  const res = http.get(`${BASE}/api/v1/projects/phase4/stream`, {
    headers,
    timeout: "120s",
  });
  const ok = check(res, {
    "stream completes": (r) => r.status === 200 && parseSseDone(r.body),
  });
  if (!ok && res.status === 200) {
    check(res, {
      "has data": (r) => (r.body && r.body.length > 0) || false,
    });
  }
}
