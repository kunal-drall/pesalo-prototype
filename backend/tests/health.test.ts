import request from "supertest";

import { createApp } from "../src/app";

describe("health route", () => {
  it("returns service status", async () => {
    const response = await request(createApp()).get("/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
