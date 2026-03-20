import {
  DOW_KEYS,
  MONTH_KEYS,
} from "@/components/calendar/constants";

describe("calendar constants", () => {
  it("defines month and weekday translation keys", () => {
    expect(MONTH_KEYS).toEqual([
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ]);
    expect(DOW_KEYS).toEqual(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  });
});
