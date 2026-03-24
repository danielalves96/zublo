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

  it("shows 'change_icon' text on upload button when currentSrc is provided", () => {
    render(<IconPicker currentSrc="http://img.png" hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    expect(screen.getByText(/change_icon/)).toBeInTheDocument();
  });

  it("shows 'icon' text on upload button when currentSrc is null", () => {
    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    // Button contains "icon" text
    expect(screen.getByRole("button", { name: /icon/ })).toBeInTheDocument();
  });

  it("does not show remove button when hasUploadedIcon is false", () => {
    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    expect(screen.queryByText("remove_icon")).not.toBeInTheDocument();
  });

  it("calls onFileChange when file input changes with valid file", () => {
    const onFileChange = vi.fn();
    // Mock URL.createObjectURL
    const mockUrl = "blob:mock-url";
    global.URL.createObjectURL = vi.fn(() => mockUrl);

    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={onFileChange} />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const mockFile = new File(["content"], "test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    expect(onFileChange).toHaveBeenCalledWith(mockFile, mockUrl);
  });

  it("does not call onFileChange when file input changes with no files", () => {
    const onFileChange = vi.fn();
    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={onFileChange} />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onFileChange).not.toHaveBeenCalled();
  });

  it("clicking upload button triggers file input click", () => {
    render(<IconPicker currentSrc={null} hasUploadedIcon={false} onClear={vi.fn()} onFileChange={vi.fn()} />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");
    const uploadButton = screen.getByRole("button", { name: /icon/ });
    fireEvent.click(uploadButton);
    expect(clickSpy).toHaveBeenCalled();
  });
});
