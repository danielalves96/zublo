/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0014 — Chat history timestamps
 *
 * Ensures chat collections have explicit timestamp fields used by the
 * custom chat-history routes for sorting and grouping in the UI.
 */
migrate(
  (app) => {
    var convCol = app.findCollectionByNameOrId("chat_conversations");
    var msgCol = app.findCollectionByNameOrId("chat_messages");

    function hasField(col, name) {
      for (var i = 0; i < col.fields.length; i++) {
        if (col.fields[i].name === name) return true;
      }
      return false;
    }

    var convChanged = false;
    if (!hasField(convCol, "created_at")) {
      convCol.fields.add(new DateField({ name: "created_at", required: false }));
      convChanged = true;
    }
    if (!hasField(convCol, "updated_at")) {
      convCol.fields.add(new DateField({ name: "updated_at", required: false }));
      convChanged = true;
    }
    if (convChanged) app.save(convCol);

    var msgChanged = false;
    if (!hasField(msgCol, "created_at")) {
      msgCol.fields.add(new DateField({ name: "created_at", required: false }));
      msgChanged = true;
    }
    if (msgChanged) app.save(msgCol);

    // Backfill existing conversations
    var convRecs = app.findRecordsByFilter("chat_conversations", "", "", 0, 0);
    for (var ci = 0; ci < convRecs.length; ci++) {
      var conv = convRecs[ci];
      var createdAt = conv.get("created_at");
      var updatedAt = conv.get("updated_at");

      if (!createdAt) {
        createdAt = new Date().toISOString();
        conv.set("created_at", createdAt);
      }
      if (!updatedAt) {
        conv.set("updated_at", createdAt);
      }
      app.save(conv);
    }

    // Backfill existing messages
    var msgRecs = app.findRecordsByFilter("chat_messages", "", "", 0, 0);
    for (var mi = 0; mi < msgRecs.length; mi++) {
      var msg = msgRecs[mi];
      if (!msg.get("created_at")) {
        msg.set("created_at", new Date().toISOString());
        app.save(msg);
      }
    }

    console.log("[Zublo] Migration 0014: chat timestamp fields ensured");
  },
  (app) => {
    var convCol = app.findCollectionByNameOrId("chat_conversations");
    var msgCol = app.findCollectionByNameOrId("chat_messages");

    // Prefer field-name based removal to avoid relying on generated ids
    convCol.fields = convCol.fields.filter(function (f) {
      return f.name !== "created_at" && f.name !== "updated_at";
    });
    app.save(convCol);

    msgCol.fields = msgCol.fields.filter(function (f) {
      return f.name !== "created_at";
    });
    app.save(msgCol);
  }
);
