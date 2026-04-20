import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.K6_API_BASE_URL || "https://api.aistartupbuilder.com";
const TOKEN = __ENV.K6_AUTH_TOKEN || "";

export const options = {
  scenarios: {
    steady: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "5m", target: 500 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  };
  const res = http.get(`${BASE}/api/v1/projects`, params);
  check(res, { "status is 2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
