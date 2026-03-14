/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0007 — Add color_theme field to users
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let exists = false;
    for (const f of users.fields) {
      if (f.name === "color_theme") { exists = true; break; }
    }

    if (!exists) {
      users.fields.add(new TextField({ name: "color_theme", required: false }));
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("color_theme");
    app.save(users);
  }
);
