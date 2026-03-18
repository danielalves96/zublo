/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// Chat Conversation History
//
// NOTE: In PocketBase JSVM (Goja), file-scope var/function declarations
// are NOT reliably accessible inside routerAdd callbacks at request time.
// All helpers must be defined INSIDE each callback.
// ================================================================

// ── Bootstrap: create collections once when server starts ─────
onBootstrap(function (e) {
  e.next();

  var missing = [];

  try { $app.findCollectionByNameOrId("chat_conversations"); }
  catch (_) {
    missing.push({
      name: "chat_conversations", type: "base",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "user", type: "text", required: true },
        { name: "title", type: "text", required: false },
        { name: "created_at", type: "date", required: false },
        { name: "updated_at", type: "date", required: false },
      ]
    });
  }

  try { $app.findCollectionByNameOrId("chat_messages"); }
  catch (_) {
    missing.push({
      name: "chat_messages", type: "base",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "conversation", type: "text", required: true },
        { name: "role", type: "text", required: true },
        { name: "content", type: "text", required: false },
        { name: "created_at", type: "date", required: false },
      ]
    });
  }

  if (missing.length === 0) return;

  // importCollections is the most reliable way to create multiple collections at once
  try {
    $app.importCollections(missing, false);
    console.log("[chat_history] Created " + missing.length + " collection(s): " +
      missing.map(function (c) { return c.name; }).join(", "));
    return;
  } catch (e1) {
    console.error("[chat_history] importCollections failed (" + e1 + "), trying one-by-one");
  }

  // Fallback: create individually
  for (var i = 0; i < missing.length; i++) {
    try {
      var col = new Collection(missing[i]);
      $app.save(col);
      console.log("[chat_history] Created collection: " + missing[i].name);
    } catch (e2) {
      console.error("[chat_history] Cannot create " + missing[i].name + ": " + e2);
    }
  }
});

// ── GET /api/ai/conversations ─────────────────────────────────
routerAdd("GET", "/api/ai/conversations", function (e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  var userId = e.auth.id;

  // Self-healing: create collections inline if bootstrap somehow missed them
  (function ensureCollections() {
    var missing = [];
    try { $app.findCollectionByNameOrId("chat_conversations"); } catch (_) {
      missing.push({
        name: "chat_conversations", type: "base", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: "user", type: "text", required: true },
          { name: "title", type: "text", required: false },
          { name: "created_at", type: "date", required: false },
          { name: "updated_at", type: "date", required: false }
        ]
      });
    }
    try { $app.findCollectionByNameOrId("chat_messages"); } catch (_) {
      missing.push({
        name: "chat_messages", type: "base", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: "conversation", type: "text", required: true },
          { name: "role", type: "text", required: true },
          { name: "content", type: "text", required: false },
          { name: "created_at", type: "date", required: false }
        ]
      });
    }
    if (missing.length > 0) {
      try { $app.importCollections(missing, false); } catch (_) {
        for (var i = 0; i < missing.length; i++) {
          try { $app.save(new Collection(missing[i])); } catch (_) { }
        }
      }
    }
  })();

  try {
    var convs = [];
    try {
      convs = $app.findRecordsByFilter(
        "chat_conversations", "user = {:uid}", "-updated_at", 100, 0, { uid: userId }
      );
    } catch (_) {
      convs = $app.findRecordsByFilter(
        "chat_conversations", "user = {:uid}", "", 100, 0, { uid: userId }
      );
    }

    var nowIso = new Date().toISOString();
    var result = [];
    for (var i = 0; i < convs.length; i++) {
      var c = convs[i];
      var createdAt = c.get("created_at") || nowIso;
      var updatedAt = c.get("updated_at") || createdAt;
      result.push({ id: c.id, title: c.get("title"), created: createdAt, updated: updatedAt });
    }

    result.sort(function (a, b) {
      if (a.updated === b.updated) return 0;
      return a.updated < b.updated ? 1 : -1;
    });

    return e.json(200, { conversations: result });
  } catch (err) {
    return e.json(500, { error: "Failed to load conversations: " + String(err) });
  }
});

// ── GET /api/ai/conversations/:id ─────────────────────────────
routerAdd("GET", "/api/ai/conversations/{id}", function (e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  var userId = e.auth.id;
  var convId = e.request.pathValue("id");

  try {
    var convRecs = $app.findRecordsByFilter(
      "chat_conversations", "id = {:id} && user = {:uid}", "", 1, 0, { id: convId, uid: userId }
    );
    if (convRecs.length === 0) return e.json(404, { error: "Conversation not found" });

    var msgRecs = [];
    try {
      msgRecs = $app.findRecordsByFilter(
        "chat_messages", "conversation = {:cid}", "+created_at", 0, 0, { cid: convId }
      );
    } catch (_) {
      msgRecs = $app.findRecordsByFilter(
        "chat_messages", "conversation = {:cid}", "", 0, 0, { cid: convId }
      );
    }

    msgRecs.sort(function (a, b) {
      var ac = a.get("created_at") || "";
      var bc = b.get("created_at") || "";
      if (ac === bc) return 0;
      return ac < bc ? -1 : 1;
    });

    var messages = [];
    for (var i = 0; i < msgRecs.length; i++) {
      var m = msgRecs[i];
      messages.push({ role: m.get("role"), content: m.get("content") || "" });
    }
    var conv = convRecs[0];
    var convCreatedAt = conv.get("created_at") || new Date().toISOString();
    var convUpdatedAt = conv.get("updated_at") || convCreatedAt;
    return e.json(200, {
      conversation: { id: conv.id, title: conv.get("title"), created: convCreatedAt, updated: convUpdatedAt },
      messages: messages
    });
  } catch (err) {
    return e.json(500, { error: "Failed to load conversation: " + String(err) });
  }
});

// ── DELETE /api/ai/conversations/:id ─────────────────────────
routerAdd("DELETE", "/api/ai/conversations/{id}", function (e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  var userId = e.auth.id;
  var convId = e.request.pathValue("id");

  try {
    var convRecs = $app.findRecordsByFilter(
      "chat_conversations", "id = {:id} && user = {:uid}", "", 1, 0, { id: convId, uid: userId }
    );
    if (convRecs.length === 0) return e.json(404, { error: "Conversation not found" });

    var msgRecs = $app.findRecordsByFilter("chat_messages", "conversation = {:cid}", "", 0, 0, { cid: convId });
    for (var i = 0; i < msgRecs.length; i++) { $app.delete(msgRecs[i]); }
    $app.delete(convRecs[0]);
    return e.json(200, { success: true });
  } catch (err) {
    return e.json(500, { error: "Failed to delete: " + String(err) });
  }
});

// ── PATCH /api/ai/conversations/:id ──────────────────────────
routerAdd("PATCH", "/api/ai/conversations/{id}", function (e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  var userId = e.auth.id;
  var convId = e.request.pathValue("id");
  var data = e.requestInfo().body;
  if (!data || !data.title) return e.json(400, { error: "title is required" });

  try {
    var convRecs = $app.findRecordsByFilter(
      "chat_conversations", "id = {:id} && user = {:uid}", "", 1, 0, { id: convId, uid: userId }
    );
    if (convRecs.length === 0) return e.json(404, { error: "Conversation not found" });
    var conv = convRecs[0];
    conv.set("title", String(data.title).substring(0, 100));
    var hasUpdatedAt = false;
    try {
      var convCol = $app.findCollectionByNameOrId("chat_conversations");
      for (var i = 0; i < convCol.fields.length; i++) {
        if (convCol.fields[i].name === "updated_at") {
          hasUpdatedAt = true;
          break;
        }
      }
    } catch (_) { }
    if (hasUpdatedAt) conv.set("updated_at", new Date().toISOString());
    $app.save(conv);
    return e.json(200, { success: true });
  } catch (err) {
    return e.json(500, { error: "Failed to rename: " + String(err) });
  }
});
