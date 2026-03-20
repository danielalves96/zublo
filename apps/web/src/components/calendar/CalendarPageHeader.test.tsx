import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { CalendarPageHeader } from "./CalendarPageHeader";

describe("CalendarPageHeader", () => {
  it("renders the localized header and triggers export", () => {
    const onExport = vi.fn();

    render(<CalendarPageHeader onExport={onExport} />);

    expect(screen.getByText("calendar")).toBeInTheDocument();
    expect(screen.getByText("calendar_desc")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ical_export" }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
