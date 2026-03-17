/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const col = app.findCollectionByNameOrId("ai_settings");

  // Replace 'type' select with a free-text field
  try { col.fields.removeByName("type"); } catch (_) {}
  col.fields.add(new Field({ type: "text", name: "type" }));

  // Add 'name' field for free-text provider name
  if (!col.fields.getByName("name")) {
    col.fields.add(new Field({ type: "text", name: "name" }));
  }

  app.save(col);
}, (app) => {
  const col = app.findCollectionByNameOrId("ai_settings");

  try { col.fields.removeByName("type"); } catch (_) {}
  col.fields.add(new Field({
    type: "select",
    name: "type",
    values: ["chatgpt", "gemini", "openrouter", "ollama"],
  }));

  try { col.fields.removeByName("name"); } catch (_) {}

  app.save(col);
});
