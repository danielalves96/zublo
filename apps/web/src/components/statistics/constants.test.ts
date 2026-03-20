import {
  STATISTICS_COLORS,
  STATISTICS_GROUPS,
} from "@/components/statistics/constants";

describe("statistics.constants", () => {
  it("exposes the supported grouping keys and color palette", () => {
    expect(STATISTICS_GROUPS).toEqual(["category", "payment", "member"]);
    expect(STATISTICS_COLORS).toHaveLength(10);
    expect(new Set(STATISTICS_COLORS).size).toBe(STATISTICS_COLORS.length);
  });
});
