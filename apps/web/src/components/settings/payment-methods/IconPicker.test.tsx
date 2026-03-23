import { fireEvent, render, screen } from "@testing-library/react";

import { IconPicker } from "./IconPicker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("IconPicker", () => {
  it("renders upload button when no icon", () => {
    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /icon/i })).toBeInTheDocument();
  });

  it("renders image when currentSrc is provided", () => {
    render(<IconPicker currentSrc="http://img.png" hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    expect(screen.getByAltText("icon")).toBeInTheDocument();
  });

  it("shows remove button when hasUploadedIcon is true", () => {
    const onClear = vi.fn();
    render(<IconPicker currentSrc="http://img.png" hasUploadedIcon={true} onClear={onClear} onFileChange={vi.fn()} />);
    const removeButton = screen.getByRole("button", { name: /remove_icon/i });
    fireEvent.click(removeButton);
    expect(onClear).toHaveBeenCalled();
  });
});
