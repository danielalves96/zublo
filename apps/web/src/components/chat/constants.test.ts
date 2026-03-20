import {
  FILE_MARKER,
  MAX_FILE_SIZE_MB,
  MAX_SPREADSHEET_ROWS,
  SUGGESTED_PROMPTS,
} from "@/components/chat/constants";

describe("chat constants", () => {
  it("defines the export and prompt limits used by the chat UI", () => {
    expect(MAX_SPREADSHEET_ROWS).toBe(150);
    expect(MAX_FILE_SIZE_MB).toBe(5);
    expect(FILE_MARKER).toBe("[planilha:");
    expect(SUGGESTED_PROMPTS).toEqual([
      "chat.suggested_1",
      "chat.suggested_2",
      "chat.suggested_3",
      "chat.suggested_4",
    ]);
  });
});
