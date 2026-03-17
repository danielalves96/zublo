/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: POST /api/notifications/test — send a test notification
// ================================================================
routerAdd("POST", "/api/notifications/test", (e) => {
  if (!e.auth) return e.json(401, { error: "Authentication required" });

  const body = e.requestInfo().body;
  const provider = body.provider;

  if (!provider) return e.json(400, { error: "provider is required" });

  let config;
  try {
    const records = $app.findRecordsByFilter(
      "notifications_config",
      "user = {:userId}",
      "", 1, 0,
      { userId: e.auth.id }
    );
    if (records.length === 0) return e.json(404, { error: "No notification config found" });
    config = records[0];
  } catch (err) {
    return e.json(500, { error: "Failed to load config" });
  }

  const title = "🔔 Zublo — Test Notification";
  const message = "This is a test notification from Zublo.";

  try {
    switch (provider) {
      case "discord": {
        const url = config.getString("discord_webhook_url");
        if (!url) return e.json(400, { error: "Webhook URL not configured" });
        $http.send({ url, method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [{ title, description: message, color: 3447003 }] }) });
        break;
      }
      case "telegram": {
        const token = config.getString("telegram_bot_token");
        const chatId = config.getString("telegram_chat_id");
        if (!token || !chatId) return e.json(400, { error: "Token or Chat ID not configured" });
        $http.send({ url: "https://api.telegram.org/bot" + token + "/sendMessage",
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }) });
        break;
      }
      case "gotify": {
        const url = config.getString("gotify_url");
        const token = config.getString("gotify_token");
        if (!url || !token) return e.json(400, { error: "URL or token not configured" });
        $http.send({ url: url + "/message?token=" + token, method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message, priority: 5 }) });
        break;
      }
      case "pushover": {
        const userKey = config.getString("pushover_user_key");
        const apiToken = config.getString("pushover_api_token");
        if (!userKey || !apiToken) return e.json(400, { error: "User key or API token not configured" });
        $http.send({ url: "https://api.pushover.net/1/messages.json", method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiToken, user: userKey, title, message }) });
        break;
      }
      case "ntfy": {
        const ntfyUrl = config.getString("ntfy_url") || "https://ntfy.sh";
        const topic = config.getString("ntfy_topic");
        if (!topic) return e.json(400, { error: "Topic not configured" });
        $http.send({ url: ntfyUrl + "/" + topic, method: "POST",
          headers: { Title: title }, body: message });
        break;
      }
      case "pushplus": {
        const token = config.getString("pushplus_token");
        if (!token) return e.json(400, { error: "Token not configured" });
        $http.send({ url: "http://www.pushplus.plus/send", method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title, content: message, template: "markdown" }) });
        break;
      }
      case "mattermost": {
        const url = config.getString("mattermost_webhook_url");
        if (!url) return e.json(400, { error: "Webhook URL not configured" });
        $http.send({ url, method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "*" + title + "*\n" + message }) });
        break;
      }
      case "webhook": {
        const url = config.getString("webhook_url");
        if (!url) return e.json(400, { error: "Webhook URL not configured" });
        $http.send({ url, method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message }) });
        break;
      }
      case "serverchan": {
        const key = config.getString("serverchan_send_key");
        if (!key) return e.json(400, { error: "SendKey not configured" });
        $http.send({ url: "https://sctapi.ftqq.com/" + key + ".send", method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, desp: message }) });
        break;
      }
      case "email": {
        const toEmail = config.getString("email_to");
        if (!toEmail) return e.json(400, { error: "Destination email not configured" });
        const msg = new MailerMessage({
          from: { address: $app.settings().meta.senderAddress || "noreply@zublo.app" },
          to: [{ address: toEmail }],
          subject: title,
          html: "<p>" + message + "</p>",
        });
        $app.newMailClient().send(msg);
        break;
      }
      default:
        return e.json(400, { error: "Unknown provider: " + provider });
    }
  } catch (err) {
    return e.json(500, { error: "Failed to send: " + String(err) });
  }

  return e.json(200, { success: true });
});
