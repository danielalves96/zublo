import type { PendingFile, ChatConversationGroup } from "./chat.types";

describe("chat.types", () => {
  it("exports PendingFile and ChatConversationGroup types", () => {
    const file: PendingFile = { name: "test.csv", rows: [{ a: 1 }], headers: ["a"] };
    const group: ChatConversationGroup = { label: "Today", items: [] };

    expect(file.name).toBe("test.csv");
    expect(group.label).toBe("Today");
  });
});
