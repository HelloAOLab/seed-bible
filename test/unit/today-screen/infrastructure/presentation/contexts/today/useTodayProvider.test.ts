import { useTodayProvider } from "todayScreen.infrastructure.presentation.contexts.today.useTodayProvider";
import type { TodayConfig } from "todayScreen.infrastructure.presentation.components.Today";

const config = {
  language: "en",
  username: "Alice",
  theme: { variables: {} },
} as unknown as TodayConfig;

describe("useTodayProvider", () => {
  it("returns a value equal to the provided config", () => {
    expect(useTodayProvider(config)).toEqual(config);
  });

  it("returns a new object (shallow copy), not the same reference", () => {
    expect(useTodayProvider(config)).not.toBe(config);
  });

  it("carries over every config property", () => {
    const result = useTodayProvider(config);
    expect(result.language).toBe("en");
    expect(result.username).toBe("Alice");
    expect(result.theme).toBe(config.theme);
  });

  it("does not mutate the original config", () => {
    const original = { ...config } as unknown as TodayConfig;
    const result = useTodayProvider(config);
    result.language = "es";
    expect(config).toEqual(original);
  });
});
