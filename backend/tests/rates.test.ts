import request from "supertest";

import { createApp } from "../src/app";

describe("rates route", () => {
  it("returns a well-formed rates payload", async () => {
    const response = await request(createApp()).get("/v1/rates");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rates)).toBe(true);
    expect(Array.isArray(response.body.flexRates)).toBe(true);
    expect(typeof response.body.updatedAt).toBe("string");

    // Without configured market contracts the lists are empty, which is
    // the correct response. When live, each row carries the canonical
    // protocol shape — assert that whenever rows do appear.
    for (const rate of response.body.rates) {
      expect(rate).toEqual(
        expect.objectContaining({
          asset: expect.any(String),
          maturity: expect.any(String),
          fixedAPY: expect.any(Number),
          days: expect.any(Number),
          market: expect.any(String),
        }),
      );
    }
    for (const flex of response.body.flexRates) {
      expect(flex).toEqual(
        expect.objectContaining({
          asset: expect.any(String),
          apy: expect.any(Number),
        }),
      );
    }
  });
});
