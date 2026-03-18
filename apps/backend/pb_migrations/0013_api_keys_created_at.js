/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    var col = app.findCollectionByNameOrId("api_keys");
    col.fields.add(new TextField({ name: "created_at" }));
    app.save(col);
    console.log("[Zublo] Migration 0013: added created_at to api_keys");
  },
  (app) => {
    var col = app.findCollectionByNameOrId("api_keys");
    col.fields.removeById("created_at");
    app.save(col);
  }
);
