/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0021 — Add the OIDC subject identifier to users.
 *
 * SSO accounts must be linked by the provider's immutable `sub` claim rather
 * than by email: emails can be reassigned at the identity provider, and
 * matching on them alone lets anyone who can register an address there take
 * over the matching local account. The field is hidden so it never leaves the
 * server in an auth response.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let hasSubject = false;
    for (const field of users.fields) {
      if (field.name === "oidc_subject") {
        hasSubject = true;
        field.hidden = true;
      }
    }

    if (!hasSubject) {
      users.fields.add(new TextField({
        name: "oidc_subject",
        required: false,
        hidden: true,
      }));
    }

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields = users.fields.filter((field) => field.name !== "oidc_subject");
    app.save(users);
  }
);
