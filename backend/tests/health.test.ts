import request from "supertest";

import { createApp } from "../src/app";

describe("health route", () => {
  it("returns service status with the expected shape", async () => {
    const response = await request(createApp()).get("/v1/health");

    expect(response.status).toBe(200);
    // When no contracts are configured the service reports "degraded",
    // which is the correct signal. When deployed contracts are wired into
    // env, it reports "ok". Both are valid; we just enforce the contract
    // of the response body.
    expect(["ok", "degraded"]).toContain(response.body.status);
    expect(typeof response.body.contractsHealthy).toBe("boolean");
    expect(typeof response.body.oracleFresh).toBe("boolean");
    expect(typeof response.body.markets).toBe("number");
    expect(response.body.rpcUrl).toBeTruthy();
  });
});
