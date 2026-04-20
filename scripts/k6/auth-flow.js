import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.K6_API_BASE_URL || "https://api.aistartupbuilder.com";

export const options = {
  scenarios: {
    auth: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 200 },
        { duration: "2m", target: 200 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.005"],
  },
};

export default function () {
  const email = `k6_${__VU}_${__ITER}@example.com`;
  const password = "K6-test-password!1";

  const reg = http.post(
    `${BASE}/api/v1/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(reg, { "register 2xx": (r) => r.status >= 200 && r.status < 300 });

  const login = http.post(
    `${BASE}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(login, { "login 2xx": (r) => r.status >= 200 && r.status < 300 });

  const refreshToken = login.json("refreshToken");
  if (refreshToken) {
    const refresh = http.post(
      `${BASE}/api/v1/auth/refresh`,
      JSON.stringify({ refreshToken }),
      { headers: { "Content-Type": "application/json" } }
    );
    check(refresh, { "refresh 2xx": (r) => r.status >= 200 && r.status < 300 });
  }

  sleep(0.3);
}
