import { describe, expect, it } from "vitest";

import { getNextTheme, isDarkTheme } from "@/lib/theme";

describe("theme toggle", () => {
  it.each([
    ["light", "dark"],
    ["dark", "light"],
    ["pink", "pink-dark"],
    ["pink-dark", "pink"],
    ["blue", "blue-dark"],
    ["blue-dark", "blue"],
  ] as const)("switches %s to %s", (theme, expectedTheme) => {
    expect(getNextTheme(theme, theme)).toBe(expectedTheme);
  });

  it("uses the resolved mode when following the device theme", () => {
    expect(getNextTheme("system", "light")).toBe("dark");
    expect(getNextTheme("system", "dark")).toBe("light");
  });

  it("recognizes every dark theme family", () => {
    expect(isDarkTheme("dark")).toBe(true);
    expect(isDarkTheme("pink-dark")).toBe(true);
    expect(isDarkTheme("blue-dark")).toBe(true);
    expect(isDarkTheme("light")).toBe(false);
    expect(isDarkTheme("pink")).toBe(false);
    expect(isDarkTheme("blue")).toBe(false);
  });
});
