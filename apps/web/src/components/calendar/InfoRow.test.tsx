import { render, screen } from "@testing-library/react";

import { InfoRow } from "./InfoRow";

describe("InfoRow", () => {
  it("renders the icon, label, and child content", () => {
    render(
      <InfoRow icon={<span>ICON</span>} label="Due date">
        Tomorrow
      </InfoRow>,
    );

    expect(screen.getByText("ICON")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });
});
