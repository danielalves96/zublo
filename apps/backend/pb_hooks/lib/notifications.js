function sendDiscord(webhookUrl, title, message) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{ title: title, description: message, color: 3447003 }],
    }),
  });
}

function sendTelegram(botToken, chatId, message) {
  $http.send({
    url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}

function sendGotify(serverUrl, token, title, message) {
  $http.send({
    url: serverUrl + "/message?token=" + token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title, message: message, priority: 5 }),
  });
}

function sendPushover(userKey, apiToken, title, message) {
  $http.send({
    url: "https://api.pushover.net/1/messages.json",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: apiToken,
      user: userKey,
      title: title,
      message: message,
    }),
  });
}

function sendNtfy(serverUrl, topic, title, message) {
  const url = (serverUrl || "https://ntfy.sh") + "/" + topic;
  $http.send({
    url: url,
    method: "POST",
    headers: { Title: title },
    body: message,
  });
}

function sendPushPlus(token, title, message) {
  $http.send({
    url: "http://www.pushplus.plus/send",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: token,
      title: title,
      content: message,
      template: "markdown",
    }),
  });
}

function sendMattermost(webhookUrl, message) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

function sendWebhookNotification(webhookUrl, templatePayload) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(templatePayload),
  });
}

function sendServerChan(key, title, message) {
  $http.send({
    url: "https://sctapi.ftqq.com/" + key + ".send",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title, desp: message }),
  });
}

function sendEmail(app, toEmail, subject, body) {
  const message = new MailerMessage({
    from: { address: app.settings().meta.senderAddress || "noreply@zublo.app" },
    to: [{ address: toEmail }],
    subject: subject,
    html: body,
  });
  app.newMailClient().send(message);
}

/**
 * Dispatches a notification to all enabled providers for a given config record.
 * Each provider's enabled flag and credentials are stored as flat fields.
 */
function dispatchToAllProviders(app, notifConfig, title, message, subsData) {
  if (notifConfig.getBool("email_enabled")) {
    const to = notifConfig.getString("email_to");
    if (to) try { sendEmail(app, to, title, message); } catch (e) { console.log("[Zublo] email err:", e); }
  }
  if (notifConfig.getBool("discord_enabled")) {
    const url = notifConfig.getString("discord_webhook_url");
    if (url) try { sendDiscord(url, title, message); } catch (e) { console.log("[Zublo] discord err:", e); }
  }
  if (notifConfig.getBool("telegram_enabled")) {
    const token = notifConfig.getString("telegram_bot_token");
    const chatId = notifConfig.getString("telegram_chat_id");
    if (token && chatId) try { sendTelegram(token, chatId, message); } catch (e) { console.log("[Zublo] telegram err:", e); }
  }
  if (notifConfig.getBool("gotify_enabled")) {
    const url = notifConfig.getString("gotify_url");
    const token = notifConfig.getString("gotify_token");
    if (url && token) try { sendGotify(url, token, title, message); } catch (e) { console.log("[Zublo] gotify err:", e); }
  }
  if (notifConfig.getBool("pushover_enabled")) {
    const userKey = notifConfig.getString("pushover_user_key");
    const apiToken = notifConfig.getString("pushover_api_token");
    if (userKey && apiToken) try { sendPushover(userKey, apiToken, title, message); } catch (e) { console.log("[Zublo] pushover err:", e); }
  }
  if (notifConfig.getBool("ntfy_enabled")) {
    const url = notifConfig.getString("ntfy_url");
    const topic = notifConfig.getString("ntfy_topic");
    if (topic) try { sendNtfy(url, topic, title, message); } catch (e) { console.log("[Zublo] ntfy err:", e); }
  }
  if (notifConfig.getBool("pushplus_enabled")) {
    const token = notifConfig.getString("pushplus_token");
    if (token) try { sendPushPlus(token, title, message); } catch (e) { console.log("[Zublo] pushplus err:", e); }
  }
  if (notifConfig.getBool("mattermost_enabled")) {
    const url = notifConfig.getString("mattermost_webhook_url");
    if (url) try { sendMattermost(url, message); } catch (e) { console.log("[Zublo] mattermost err:", e); }
  }
  if (notifConfig.getBool("webhook_enabled")) {
    const url = notifConfig.getString("webhook_url");
    if (url) try { sendWebhookNotification(url, { title, message, subscriptions: subsData }); } catch (e) { console.log("[Zublo] webhook err:", e); }
  }
  if (notifConfig.getBool("serverchan_enabled")) {
    const key = notifConfig.getString("serverchan_send_key");
    if (key) try { sendServerChan(key, title, message); } catch (e) { console.log("[Zublo] serverchan err:", e); }
  }
}

module.exports = {
  sendDiscord,
  sendTelegram,
  sendGotify,
  sendPushover,
  sendNtfy,
  sendPushPlus,
  sendMattermost,
  sendWebhookNotification,
  sendServerChan,
  sendEmail,
  dispatchToAllProviders
};
