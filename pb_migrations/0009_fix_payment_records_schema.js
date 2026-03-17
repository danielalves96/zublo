/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0009 — Fix payment_records schema
 *
 * Corrige ambientes onde a collection `payment_records` ficou com apenas
 * os campos `id` e `user`, causando erro 400 ao criar/atualizar pagamentos.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("payment_records");

    const hasField = (name) => {
      for (const f of col.fields) {
        if (f.name === name) return true;
      }
      return false;
    };

    if (!hasField("subscription_id")) {
      col.fields.add(new TextField({ name: "subscription_id", required: true }));
    }

    if (!hasField("due_date")) {
      col.fields.add(new TextField({ name: "due_date", required: true }));
    }

    if (!hasField("paid_at")) {
      col.fields.add(new TextField({ name: "paid_at", required: false }));
    }

    if (!hasField("auto_paid")) {
      col.fields.add(new BoolField({ name: "auto_paid", required: false }));
    }

    if (!hasField("amount")) {
      col.fields.add(new NumberField({ name: "amount", required: false }));
    }

    if (!hasField("notes")) {
      col.fields.add(new TextField({ name: "notes", required: false }));
    }

    if (!hasField("proof")) {
      col.fields.add(
        new FileField({
          name: "proof",
          required: false,
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
          ],
        }),
      );
    }

    const ownerRule = "@request.auth.id != '' && user = @request.auth.id";
    col.listRule = ownerRule;
    col.viewRule = ownerRule;
    col.createRule = "@request.auth.id != ''";
    col.updateRule = ownerRule;
    col.deleteRule = ownerRule;

    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("payment_records");

    for (const name of [
      "subscription_id",
      "due_date",
      "paid_at",
      "auto_paid",
      "amount",
      "notes",
      "proof",
    ]) {
      try {
        col.fields.removeByName(name);
      } catch (_) { }
    }

    app.save(col);
  },
);
