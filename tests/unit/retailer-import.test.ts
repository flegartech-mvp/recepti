import { describe, expect, it } from "vitest";

import {
  parseCatalogCsv,
  parseCatalogJson,
  sourceHash,
} from "@/lib/retailers/importer";
import {
  isSafeRetailerSourceUrl,
  sanitizeCsvCell,
  validateRetailerImageBytes,
} from "@/lib/retailers/security";

describe("retailer imports and security", () => {
  it("parses semicolon CSV with decimal commas", () => {
    const result = parseCatalogCsv(
      "externalId;name;packageText;price;observedAt\n1;Mleko;1 l;1,29;2026-07-15T08:00:00.000Z",
      "spar-si",
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0]).toMatchObject({ price: 1.29, packageUnit: "l" });
  });

  it("parses JSON and isolates malformed rows", () => {
    const result = parseCatalogJson(
      JSON.stringify([
        {
          externalId: "1",
          name: "Moka",
          observedAt: "2026-07-15T08:00:00.000Z",
        },
        { externalId: "2", name: "" },
      ]),
      "hofer-si",
    );
    expect(result.products).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  it("rejects duplicate retailer identifiers", () => {
    const row = {
      externalId: "same",
      name: "Riž",
      observedAt: "2026-07-15T08:00:00.000Z",
    };
    const result = parseCatalogJson(JSON.stringify([row, row]), "lidl-si");
    expect(result.products).toHaveLength(1);
    expect(result.errors[0].message).toContain("Duplicate");
  });

  it("creates stable source hashes", () => {
    expect(sourceHash({ a: 1 })).toBe(sourceHash({ a: 1 }));
    expect(sourceHash({ a: 1 })).not.toBe(sourceHash({ a: 2 }));
  });

  it("blocks private or non-allowlisted source URLs", () => {
    expect(isSafeRetailerSourceUrl("http://spar.si/x", ["spar.si"])).toBe(
      false,
    );
    expect(isSafeRetailerSourceUrl("https://127.0.0.1/x", ["127.0.0.1"])).toBe(
      false,
    );
    expect(isSafeRetailerSourceUrl("https://evil.example/x", ["spar.si"])).toBe(
      false,
    );
    expect(isSafeRetailerSourceUrl("https://www.spar.si/x", ["spar.si"])).toBe(
      true,
    );
  });

  it("protects spreadsheet exports from formula injection", () => {
    expect(sanitizeCsvCell('=HYPERLINK("https://bad")')).toMatch(/^'/);
    expect(sanitizeCsvCell("normal value")).toBe("normal value");
  });

  it("validates image size and byte signatures", () => {
    expect(
      validateRetailerImageBytes(
        new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      validateRetailerImageBytes(
        new Uint8Array([0x00, 0xd8, 0xff]),
        "image/jpeg",
      ),
    ).toBe(false);
  });
});
