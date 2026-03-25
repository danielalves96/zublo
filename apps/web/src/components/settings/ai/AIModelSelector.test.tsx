import { fireEvent, render, screen } from "@testing-library/react";

import { AIModelSelector } from "./AIModelSelector";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

describe("AIModelSelector", () => {
  it("renders model label", () => {
    render(
      <AIModelSelector
        canFetchModels={false}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("model")).toBeInTheDocument();
  });

  it("renders fetch models button", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("fetch_models")).toBeInTheDocument();
  });

  it("renders fetching_models when fetchingModels is true", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={true}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("fetching_models")).toBeInTheDocument();
  });

  it("calls onFetchModels when fetch button is clicked", () => {
    const onFetchModels = vi.fn();
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={onFetchModels}
        onModelChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("fetch_models"));
    expect(onFetchModels).toHaveBeenCalled();
  });

  it("renders text input when no models are available", () => {
    const onModelChange = vi.fn();
    render(
      <AIModelSelector
        canFetchModels={false}
        fetchingModels={false}
        model="gpt-4"
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={onModelChange}
      />,
    );
    const input = screen.getByDisplayValue("gpt-4");
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "gpt-3.5" } });
    expect(onModelChange).toHaveBeenCalledWith("gpt-3.5");
  });

  it("renders fetch_models_hint when no models are available", () => {
    render(
      <AIModelSelector
        canFetchModels={false}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("fetch_models_hint")).toBeInTheDocument();
  });

  it("renders combobox trigger when models are available", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4", "gpt-3.5"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("select_model")).toBeInTheDocument();
  });

  it("shows selected model in combobox trigger", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model="gpt-4"
        models={["gpt-4", "gpt-3.5"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });

  it("opens popover and shows model list when trigger is clicked", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4", "gpt-3.5"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("search_model")).toBeInTheDocument();
  });

  it("filters models based on search input", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4", "gpt-3.5", "claude-3"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("search_model");
    fireEvent.change(searchInput, { target: { value: "gpt" } });
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("gpt-3.5")).toBeInTheDocument();
    expect(screen.queryByText("claude-3")).not.toBeInTheDocument();
  });

  it("shows no_models_found when search yields no results", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("search_model");
    fireEvent.change(searchInput, { target: { value: "xxxxxxx" } });
    expect(screen.getByText("no_models_found")).toBeInTheDocument();
  });

  it("does not clear search when popover closes (nextOpen false branch)", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4", "gpt-3.5"]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    // Open the popover
    fireEvent.click(screen.getByRole("combobox"));
    // Type something in the search box
    const searchInput = screen.getByPlaceholderText("search_model");
    fireEvent.change(searchInput, { target: { value: "gpt" } });
    // Close the popover by clicking the trigger again
    fireEvent.click(screen.getByRole("combobox"));
    // Popover is now closed — the false branch of `if (nextOpen)` was taken
    expect(screen.queryByPlaceholderText("search_model")).not.toBeInTheDocument();
  });

  it("calls onModelChange and closes popover when a model is selected", () => {
    const onModelChange = vi.fn();
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={["gpt-4", "gpt-3.5"]}
        onFetchModels={vi.fn()}
        onModelChange={onModelChange}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("gpt-4"));
    expect(onModelChange).toHaveBeenCalledWith("gpt-4");
  });
});
