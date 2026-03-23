import type { ChatConversationGroup, PendingFile } from "./chat.types";

describe("chat.types", () => {
  it("PendingFile can be constructed with all required fields", () => {
    const file: PendingFile = {
      name: "data.csv",
      rows: [{ col1: "a", col2: "b" }],
      headers: ["col1", "col2"],
    };
    expect(file.name).toBe("data.csv");
    expect(file.rows).toHaveLength(1);
    expect(file.headers).toEqual(["col1", "col2"]);
  });

  it("ChatConversationGroup can be constructed", () => {
    const group: ChatConversationGroup = {
      label: "Today",
      items: [],
    };
    expect(group.label).toBe("Today");
    expect(group.items).toHaveLength(0);
  });
});
