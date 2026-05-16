import request from "supertest";

import { createApp } from "../src/app";

describe("rates route", () => {
  it("returns fixed and flex rates", async () => {
    const response = await request(createApp()).get("/v1/rates");

    expect(response.status).toBe(200);
    expect(response.body.rates).toHaveLength(2);
    expect(response.body.flexRates).toHaveLength(3);
  });
});
