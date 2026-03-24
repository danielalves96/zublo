import { fireEvent, render, screen } from "@testing-library/react";

import { FixerActions } from "./FixerActions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("FixerActions", () => {
  it("renders save and update buttons", () => {
    render(<FixerActions canSave canUpdateRates saving={false} updatingRates={false} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("save")).toBeInTheDocument();
    expect(screen.getByText("update_exchange")).toBeInTheDocument();
  });

  it("disables save when canSave is false", () => {
    render(<FixerActions canSave={false} canUpdateRates saving={false} updatingRates={false} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("save").closest("button")).toBeDisabled();
  });

  it("calls onSave when save clicked", () => {
    const onSave = vi.fn();
    render(<FixerActions canSave canUpdateRates saving={false} updatingRates={false} onSave={onSave} onUpdateRates={vi.fn()} />);
    fireEvent.click(screen.getByText("save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("shows loading text when saving", () => {
    render(<FixerActions canSave canUpdateRates saving={true} updatingRates={false} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("disables save button when saving", () => {
    render(<FixerActions canSave canUpdateRates saving={true} updatingRates={false} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("loading").closest("button")).toBeDisabled();
  });

  it("disables update rates button when canUpdateRates is false", () => {
    render(<FixerActions canSave={true} canUpdateRates={false} saving={false} updatingRates={false} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("update_exchange").closest("button")).toBeDisabled();
  });

  it("disables update rates button when updatingRates is true", () => {
    render(<FixerActions canSave={true} canUpdateRates={true} saving={false} updatingRates={true} onSave={vi.fn()} onUpdateRates={vi.fn()} />);
    expect(screen.getByText("update_exchange").closest("button")).toBeDisabled();
  });

  it("calls onUpdateRates when update exchange button clicked", () => {
    const onUpdateRates = vi.fn();
    render(<FixerActions canSave canUpdateRates saving={false} updatingRates={false} onSave={vi.fn()} onUpdateRates={onUpdateRates} />);
    fireEvent.click(screen.getByText("update_exchange"));
    expect(onUpdateRates).toHaveBeenCalled();
  });
});
