const xlsxMocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn(() => "worksheet"),
  bookNew: vi.fn(() => "workbook"),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: xlsxMocks.jsonToSheet,
    book_new: xlsxMocks.bookNew,
    book_append_sheet: xlsxMocks.bookAppendSheet,
  },
  writeFile: xlsxMocks.writeFile,
}));

import type { ChatConversation } from "@/types";

import {
  buildConversationTitle,
  extractFileChip,
  groupConversations,
  triggerExportDownload,
} from "./utils";

describe("chat utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports spreadsheet data through xlsx helpers", async () => {
    const data = [{ name: "Netflix" }];

    await triggerExportDownload("xlsx", "subscriptions.xlsx", data);

    expect(xlsxMocks.jsonToSheet).toHaveBeenCalledWith(data);
    expect(xlsxMocks.bookNew).toHaveBeenCalled();
    expect(xlsxMocks.bookAppendSheet).toHaveBeenCalledWith(
      "workbook",
      "worksheet",
      "Subscriptions",
    );
    expect(xlsxMocks.writeFile).toHaveBeenCalledWith(
      "workbook",
      "subscriptions.xlsx",
    );
  });

  it("exports json data through a generated anchor element", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    const createObjectURL = vi.fn(() => "blob:chat-export");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = click;
      }
      return element;
    }) as typeof document.createElement);

    await triggerExportDownload("json", "subscriptions.json", [{ id: "sub-1" }]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:chat-export");

    vi.unstubAllGlobals();
  });

  it("swallows export errors", async () => {
    xlsxMocks.writeFile.mockImplementationOnce(() => {
      throw new Error("write failed");
    });

    await expect(
      triggerExportDownload("xlsx", "subscriptions.xlsx", [{ id: "sub-1" }]),
    ).resolves.toBeUndefined();
  });

  it("extracts file chips from the supported content formats", () => {
    expect(extractFileChip("[planilha:report.csv]")).toEqual({
      text: "",
      chip: "report.csv",
    });
    expect(extractFileChip("Analise\n\n[planilha:report.csv]")).toEqual({
      text: "Analise",
      chip: "report.csv",
    });
    expect(extractFileChip("[planilha:missing-end")).toEqual({
      text: "",
      chip: null,
    });
    expect(extractFileChip("Plain message")).toEqual({
      text: "Plain message",
      chip: null,
    });
  });

  it("builds conversation titles without attached-file markers", () => {
    expect(
      buildConversationTitle("Resumo mensal [planilha:report.csv] com variacoes"),
    ).toBe("Resumo mensal  com variacoes");
    expect(buildConversationTitle("[PLANILHA ANEXADA:report.csv]")).toBe(
      "New Conversation",
    );
  });

  it("groups conversations by recency buckets and omits empty ones", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T15:00:00Z"));

    const labels = {
      today: "Today",
      yesterday: "Yesterday",
      last7: "Last 7 Days",
      last30: "Last 30 Days",
      older: "Older",
    };

    const getConversation = (
      id: string,
      updated: string,
      title = `Conversation ${id}`,
    ): ChatConversation => ({
      id,
      title,
      created: updated,
      updated,
    });

    const grouped = groupConversations(
      [
        getConversation("today", "2026-03-20T08:00:00Z"),
        getConversation("yesterday", "2026-03-19T12:00:00Z"),
        getConversation("last7", "2026-03-15T09:00:00Z"),
        getConversation("last30", "2026-03-01T09:00:00Z"),
        getConversation("older", "2026-01-10T09:00:00Z"),
      ],
      labels,
    );

    expect(grouped).toEqual([
      { label: "Today", items: [expect.objectContaining({ id: "today" })] },
      {
        label: "Yesterday",
        items: [expect.objectContaining({ id: "yesterday" })],
      },
      {
        label: "Last 7 Days",
        items: [expect.objectContaining({ id: "last7" })],
      },
      {
        label: "Last 30 Days",
        items: [expect.objectContaining({ id: "last30" })],
      },
      { label: "Older", items: [expect.objectContaining({ id: "older" })] },
    ]);

    vi.useRealTimers();
  });
});
