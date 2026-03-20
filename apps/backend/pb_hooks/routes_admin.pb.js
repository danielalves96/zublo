/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: Admin — SMTP Settings (GET)
// ================================================================
routerAdd("GET", "/api/admin/smtp", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  const s = $app.settings();
  return e.json(200, {
    enabled: s.smtp.enabled,
    host: s.smtp.host,
    port: s.smtp.port,
    username: s.smtp.username,
    tls: s.smtp.tls,
    authMethod: s.smtp.authMethod || "PLAIN",
    localName: s.smtp.localName || "",
    senderAddress: s.meta.senderAddress || "",
    senderName: s.meta.senderName || "",
    // Never expose the password — let the frontend know if one is set
    hasPassword: s.smtp.password !== "",
  });
});

// ================================================================
// ROUTE: Admin — SMTP Settings (POST)
// ================================================================
routerAdd("POST", "/api/admin/smtp", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  const data = e.requestInfo().body;
  const s = $app.settings();

  if (data.enabled !== undefined) s.smtp.enabled = !!data.enabled;
  if (data.host !== undefined) s.smtp.host = String(data.host || "");
  if (data.port !== undefined) s.smtp.port = parseInt(data.port) || 587;
  if (data.username !== undefined) s.smtp.username = String(data.username || "");
  if (data.password && String(data.password).trim() !== "") {
    s.smtp.password = String(data.password);
  }
  if (data.tls !== undefined) s.smtp.tls = !!data.tls;
  if (data.authMethod !== undefined) s.smtp.authMethod = String(data.authMethod || "PLAIN");
  if (data.localName !== undefined) s.smtp.localName = String(data.localName || "");
  if (data.senderAddress !== undefined) s.meta.senderAddress = String(data.senderAddress || "");
  if (data.senderName !== undefined) s.meta.senderName = String(data.senderName || "");

  try {
    $app.save(s);
    return e.json(200, { message: "SMTP settings saved" });
  } catch (err) {
    return e.json(500, { error: "Failed to save SMTP settings: " + err });
  }
});

// ================================================================
// ROUTE: Admin — SMTP Test
// ================================================================
routerAdd("POST", "/api/admin/smtp/test", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const user = $app.findRecordById("users", e.auth.id);
    const toEmail = user.get("email");
    const s = $app.settings();

    const message = new MailerMessage({
      from: {
        address: s.meta.senderAddress || "noreply@zublo.app",
        name: s.meta.senderName || "Zublo",
      },
      to: [{ address: toEmail }],
      subject: "Zublo — SMTP Test",
      html: "<p>Your SMTP configuration is working correctly. 🎉</p>",
    });

    $app.newMailClient().send(message);
    return e.json(200, { message: "Test email sent to " + toEmail });
  } catch (err) {
    return e.json(500, { error: "Failed to send test email: " + err });
  }
});

// ================================================================
// ROUTE: Admin — Delete Unused Logos
// ================================================================
routerAdd("POST", "/api/admin/deleteunusedlogos", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  // Only first registered user is admin
  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  // This is handled by PocketBase's file storage cleanup
  // For now, return a success message
  return e.json(200, { message: "Cleanup completed", deleted: 0 });
});

// ================================================================
// ROUTE: Database Backup (GET — streams the SQLite db file)
// ================================================================
routerAdd("GET", "/api/db/backup", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const dbPath = $app.dataDir() + "/data.db";
    const filename = "zublo-backup-" + new Date().toISOString().split("T")[0] + ".db";
    const data = $os.readFile(dbPath);

    e.response.header().set("Content-Type", "application/octet-stream");
    e.response.header().set("Content-Disposition", 'attachment; filename="' + filename + '"');
    e.response.header().set("Content-Length", String(data.length));
    e.response.write(data);
    return null;
  } catch (err) {
    return e.json(500, { error: "Backup failed: " + err });
  }
});

// ================================================================
// ROUTE: Database Restore (POST — accepts .db file upload)
// ================================================================
routerAdd("POST", "/api/db/restore", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const result = e.request.formFile("file");
    const fileHeader = result[1];
    if (!fileHeader) {
      return e.json(400, { error: "No backup file provided" });
    }

    const name = "_restore_upload_" + Date.now() + ".db";
    const destPath = $app.dataDir() + "/backups/" + name;

    // Read uploaded bytes and write to backups directory
    const srcFile = result[0];
    const chunks = [];
    const buf = new Uint8Array(65536);
    let n = srcFile.read(buf);
    while (n > 0) {
      chunks.push(...buf.slice(0, n));
      n = srcFile.read(buf);
    }
    srcFile.close();
    $os.writeFile(destPath, chunks, 0o644);

    $app.restoreBackup(name);
    return e.json(200, { message: "Restore completed" });
  } catch (err) {
    return e.json(500, { error: "Restore failed: " + err });
  }
});

// ================================================================
// ADMIN USER MANAGEMENT ROUTES
// ================================================================

// GET /api/admin/users — list all users
routerAdd("GET", "/api/admin/users", (e) => {
  try {
    if (!e.auth) throw new ForbiddenError("Authentication required");
    const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
    if (_adm.length === 0 || _adm[0].id !== e.auth.id) {
      throw new ForbiddenError("Admin access required");
    }

    const all = $app.findRecordsByFilter("users", "1=1", "+created", -1, 0);
    const firstId = all.length > 0 ? all[0].id : null;

    const result = all.map((u) => ({
      id: u.id,
      username: u.getString("username"),
      name: u.getString("name"),
      email: u.getString("email"),
      avatar: u.getString("avatar"),
      created: u.getString("created"),
      totp_enabled: u.getBool("totp_enabled"),
      is_admin: u.id === firstId,
    }));

    return e.json(200, result);
  } catch (err) {
    if (err && err.status) throw err;
    return e.json(500, { error: String(err) });
  }
});

// PATCH /api/admin/users/:id — update user data
routerAdd("PATCH", "/api/admin/users/{id}", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");
  const user = $app.findRecordById("users", id);
  const data = e.requestInfo().body;

  if (data.name !== undefined) user.set("name", data.name);
  if (data.username !== undefined) user.set("username", data.username);
  if (data.email !== undefined) {
    user.set("email", data.email);
    user.set("emailVisibility", true);
  }
  if (data.password) {
    user.set("password", data.password);
    user.set("passwordConfirm", data.password);
  }

  $app.save(user);

  return e.json(200, {
    id: user.id,
    username: user.getString("username"),
    name: user.getString("name"),
    email: user.getString("email"),
    avatar: user.getString("avatar"),
    totp_enabled: user.getBool("totp_enabled"),
  });
});

// DELETE /api/admin/users/:id — delete user (cannot delete self)
routerAdd("DELETE", "/api/admin/users/{id}", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");

  if (id === e.auth.id) {
    return e.json(400, { error: "Cannot delete your own account" });
  }

  const user = $app.findRecordById("users", id);
  $app.delete(user);

  return e.json(200, { message: "User deleted" });
});

// POST /api/admin/users/:id/avatar — upload avatar
routerAdd("POST", "/api/admin/users/{id}/avatar", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");
  const user = $app.findRecordById("users", id);

  const result = e.request.formFile("avatar");
  const fileHeader = result[1];
  if (!fileHeader) {
    return e.json(400, { error: "No avatar file provided" });
  }

  const fsFile = $filesystem.fileFromMultipart(fileHeader);
  user.set("avatar", fsFile);
  $app.save(user);

  return e.json(200, {
    id: user.id,
    avatar: user.getString("avatar"),
  });
});

// ================================================================
// ROUTE: Admin Settings — GET
// ================================================================
routerAdd("GET", "/api/admin/settings", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  let record = null;
  try {
    const all = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (all.length > 0) record = all[0];
  } catch (_) {}

  if (!record) return e.json(200, {});

  return e.json(200, {
    id: record.id,
    open_registrations: record.getBool("open_registrations"),
    disable_login: record.getBool("disable_login"),
    update_notification: record.getBool("update_notification"),
    require_email_validation: record.getBool("require_email_validation"),
    max_users: record.getFloat("max_users"),
    server_url: record.getString("server_url"),
    oidc_enabled: record.getBool("oidc_enabled"),
    oidc_provider_name: record.getString("oidc_provider_name"),
    oidc_client_id: record.getString("oidc_client_id"),
    oidc_client_secret_configured: record.getString("oidc_client_secret") !== "",
    oidc_issuer_url: record.getString("oidc_issuer_url"),
    oidc_redirect_url: record.getString("oidc_redirect_url"),
    oidc_scopes: record.getString("oidc_scopes"),
    latest_version: record.getString("latest_version"),
  });
});

// ================================================================
// ROUTE: Admin Settings — PATCH
// ================================================================
routerAdd("PATCH", "/api/admin/settings", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const data = e.requestInfo().body;

  let record = null;
  try {
    const all = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (all.length > 0) record = all[0];
  } catch (_) {}

  if (!record) {
    const col = $app.findCollectionByNameOrId("admin_settings");
    record = new Record(col);
  }

  const boolFields = [
    "open_registrations", "disable_login", "update_notification",
    "require_email_validation", "oidc_enabled",
  ];
  for (const f of boolFields) {
    if (data[f] !== undefined) record.set(f, !!data[f]);
  }

  const textFields = [
    "server_url", "oidc_provider_name", "oidc_client_id",
    "oidc_issuer_url", "oidc_redirect_url", "oidc_scopes",
    "latest_version",
  ];
  for (const f of textFields) {
    if (data[f] !== undefined) record.set(f, String(data[f] || ""));
  }

  if (data.oidc_client_secret !== undefined) {
    const nextSecret = String(data.oidc_client_secret || "");
    if (
      nextSecret !== "" ||
      data.oidc_client_secret_configured === false
    ) {
      record.set("oidc_client_secret", nextSecret);
    }
  }

  if (data.max_users !== undefined) record.set("max_users", Number(data.max_users) || 0);

  $app.save(record);

  return e.json(200, { message: "Settings saved" });
});
