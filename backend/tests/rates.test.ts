import request from "supertest";

import { createApp } from "../src/app";

describe("earn-rates route", () => {
  it("returns a well-formed earn-rates payload", async () => {
    const response = await request(createApp()).get("/v1/earn-rates");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.autoEarn)).toBe(true);
    expect(Array.isArray(response.body.boost)).toBe(true);
    expect(typeof response.body.updatedAt).toBe("string");

    for (const row of response.body.autoEarn) {
      expect(row).toEqual(
        expect.objectContaining({
          asset: expect.any(String),
          apy: expect.any(Number),
          source: expect.any(String),
        }),
      );
    }
    for (const row of response.body.boost) {
      expect(row).toEqual(
        expect.objectContaining({
          asset: expect.any(String),
          boostAPY: expect.any(Number),
          autoEarnAPY: expect.any(Number),
          rateDelta: expect.any(Number),
          market: expect.any(String),
          maturity: expect.any(String),
          daysToExpiry: expect.any(Number),
        }),
      );
    }
  });

  it("/v1/rates is preserved as a backwards-compat alias", async () => {
    const response = await request(createApp()).get("/v1/rates");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.autoEarn)).toBe(true);
    expect(Array.isArray(response.body.boost)).toBe(true);
  });
});
