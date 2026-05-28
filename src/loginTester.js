// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');
// const config = require('./config');

// const assetsDir = path.join(__dirname, '..', 'assets');

// function sanitizeFilename(value) {
//   return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
// }

// async function saveScreenshot(page, attempt, label) {
//   fs.mkdirSync(assetsDir, { recursive: true });
//   await waitForDebugCapture(page);

//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   const safeLabel = sanitizeFilename(label);
//   const basePath = path.join(assetsDir, 'attempt_' + attempt + '_' + safeLabel + '_' + timestamp);
//   const screenshotPath = basePath + '.png';
//   const htmlPath = basePath + '.html';
//   const metaPath = basePath + '.json';
//   const metadata = await getPageDebugMetadata(page);

//   await page.screenshot({ path: screenshotPath });
//   fs.writeFileSync(htmlPath, await page.content(), 'utf8');
//   fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

//   console.log('[DEBUG] Screenshot saved: ' + screenshotPath);
//   console.log('[DEBUG] Debug HTML saved: ' + htmlPath);
//   console.log('[DEBUG] Debug metadata saved: ' + metaPath);
//   return screenshotPath;
// }

// async function wait(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// async function waitForDebugCapture(page) {
//   await wait(1500);
//   await page.waitForFunction(() => {
//     return document.readyState === 'interactive' || document.readyState === 'complete';
//   }, { timeout: 5000 }).catch(() => {});
//   await page.waitForFunction(() => {
//     return document.body && document.body.innerText.trim().length > 0;
//   }, { timeout: 5000 }).catch(() => {});
// }

// async function getPageDebugMetadata(page) {
//   return page.evaluate(() => {
//     return {
//       url: window.location.href,
//       title: document.title,
//       readyState: document.readyState,
//       bodyText: document.body ? document.body.innerText.trim().slice(0, 5000) : '',
//       inputs: Array.from(document.querySelectorAll('input')).map((input) => ({
//         id: input.id,
//         name: input.name,
//         type: input.type,
//         valueLength: input.value ? input.value.length : 0,
//         placeholder: input.placeholder,
//         ariaLabel: input.getAttribute('aria-label'),
//       })),
//       buttons: Array.from(document.querySelectorAll('button, input[type="button"], div[role="button"], a')).map((button) => ({
//         id: button.id,
//         role: button.getAttribute('role'),
//         type: button.type || '',
//         text: (button.innerText || button.value || button.getAttribute('aria-label') || '').trim().slice(0, 200),
//       })).filter((button) => button.id || button.text),
//     };
//   }).catch((err) => ({
//     url: page.url(),
//     error: err.message,
//   }));
// }

// async function clickMicrosoftNext(page) {
//   await page.waitForSelector('#idSIButton9', { visible: true, timeout: 15000 });
//   await page.waitForFunction(() => {
//     const button = document.querySelector('#idSIButton9');
//     return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
//   }, { timeout: 15000 });

//   await page.evaluate(() => {
//     const button = document.querySelector('#idSIButton9');
//     button.scrollIntoView({ block: 'center', inline: 'center' });
//   });

//   console.log('[DEBUG] Clicking Next button');
//   await page.click('#idSIButton9');
// }

// async function enterEmailAndClickNext(page, email) {
//   const emailField = await page.waitForSelector('#i0116', { visible: true, timeout: 15000 }).catch(() => null);
//   if (!emailField) {
//     return false;
//   }

//   await emailField.click({ clickCount: 3 });
//   await page.keyboard.press('Backspace');
//   await page.type('#i0116', email, { delay: 50 });

//   await page.evaluate((value) => {
//     const input = document.querySelector('#i0116');
//     if (!input) return;
//     input.value = value;
//     input.dispatchEvent(new Event('input', { bubbles: true }));
//     input.dispatchEvent(new Event('change', { bubbles: true }));
//   }, email);

//   const currentUrl = page.url();
//   await clickMicrosoftNext(page);
//   await page.waitForFunction((previousUrl) => {
//     const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
//     return Boolean(
//       document.querySelector('#i0118')
//       || document.querySelector('#usernameError')
//       || document.querySelector('#aadTile')
//       || bodyText.includes('work or school')
//       || bodyText.includes('personal account')
//       || !document.querySelector('#i0116')
//       || window.location.href !== previousUrl
//     );
//   }, { timeout: 10000 }, currentUrl).catch(() => {});

//   const emailStillVisible = await page.$eval('#i0116', (input) => {
//     const style = window.getComputedStyle(input);
//     return style.visibility !== 'hidden' && style.display !== 'none' && input.offsetParent !== null;
//   }).catch(() => false);
//   const movedForward = await page.$('#i0118')
//     || await page.$('#usernameError')
//     || await page.$('#aadTile')
//     || !emailStillVisible
//     || page.url() !== currentUrl;

//   if (!movedForward) {
//     console.log('[DEBUG] Next click did not advance page, pressing Enter');
//     const emailInput = await page.$('#i0116');
//     if (!emailInput) {
//       console.log('[DEBUG] Email field disappeared before Enter fallback; continuing');
//       return true;
//     }
//     await emailInput.focus();
//     await page.keyboard.press('Enter');
//     await page.waitForFunction((previousUrl) => {
//       const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
//       return Boolean(
//         document.querySelector('#i0118')
//         || document.querySelector('#usernameError')
//         || document.querySelector('#aadTile')
//         || bodyText.includes('work or school')
//         || bodyText.includes('personal account')
//         || !document.querySelector('#i0116')
//         || window.location.href !== previousUrl
//       );
//     }, { timeout: 10000 }, currentUrl).catch(() => {});
//   }

//   return true;
// }

// async function chooseWorkSchoolAccountIfPrompted(page) {
//   const aadTile = await page.$('#aadTile');
//   if (aadTile) {
//     console.log('[DEBUG] Account picker found, choosing Work or school account');
//     await aadTile.click();
//     await wait(2000);
//     return true;
//   }

//   const clicked = await page.evaluate(() => {
//     const candidates = Array.from(document.querySelectorAll('button, div[role="button"], a, input[type="button"]'));
//     const workSchoolOption = candidates.find((element) => {
//       const text = (element.innerText || element.value || element.getAttribute('aria-label') || '').toLowerCase();
//       return text.includes('work or school') || text.includes('work/school') || text.includes('work account');
//     });

//     if (!workSchoolOption) return false;
//     workSchoolOption.scrollIntoView({ block: 'center', inline: 'center' });
//     workSchoolOption.click();
//     return true;
//   });

//   if (clicked) {
//     console.log('[DEBUG] Account picker found by text, choosing Work or school account');
//     await wait(2000);
//   }

//   return clicked;
// }

// function getAuthUrl(email) {
//   const domain = email.split('@')[1];
//   const personalDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
  
//   const tenant = personalDomains.includes(domain) ? 'consumers' : 'organizations';
  
//   return 'https://login.microsoftonline.com/' + "common" + '/oauth2/v2.0/authorize'
//     + '?scope=service%3A%3Aaccount.microsoft.com%3A%3AMBI_SSL%20openid%20profile%20offline_access'
//     + '&response_type=code'
//     + '&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7'
//     + '&redirect_uri=https%3A%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth'
//     + '&prompt=login'
//     + '&msaoauth2=true';
// }

// async function testLogin(email, password) {
//   let browser = null;
//   const authUrl = getAuthUrl(email);

//   for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
//     if (browser) {
//       try { await browser.close(); } catch (_) {}
//     }

//     try {
//       browser = await puppeteer.launch({
//         headless: config.headless ? 'new' : false,
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-dev-shm-usage',
//           '--disable-gpu',
//           '--window-size=1280,720',
//           '--disable-blink-features=AutomationControlled',
//         ],
//       });

//       const page = await browser.newPage();
//       await page.setViewport({ width: 1280, height: 720 });
//       await page.setUserAgent(
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
//         + 'AppleWebKit/537.36 (KHTML, like Gecko) '
//         + 'Chrome/127.0.0.0 Safari/537.36'
//       );

//       console.log('[DEBUG] Navigating to auth URL...');
//       await page.goto(authUrl, {
//         waitUntil: 'networkidle2',
//         timeout: config.timeout,
//       });

//       console.log('[DEBUG] Current URL: ' + page.url());
//       await saveScreenshot(page, attempt, '01_auth_page_loaded');

//       // Wait for either the email field OR an error page
//       try {
//         await page.waitForSelector('#i0116', { visible: true, timeout: 15000 });
//         console.log('[DEBUG] Found email field');
//         await saveScreenshot(page, attempt, '02_email_field_found');
//       } catch {
//         await saveScreenshot(page, attempt, '02_email_field_missing');
//         console.log('[DEBUG] Page title: ' + await page.title());
//         console.log('[DEBUG] Page URL: ' + page.url());
        
//         // Check if we hit a different page
//         if (page.url().includes('error')) {
//           return { success: false, message: 'Microsoft returned an error page - possibly blocked or rate limited' };
//         }
//         if (page.url().includes('captcha') || page.url().includes('challenge')) {
//           return { success: false, message: 'CAPTCHA or challenge page triggered - cannot automate' };
//         }
        
//         return { success: false, message: 'Could not find email input field - Microsoft may have changed their login page or blocked automation' };
//       }

//       const emailSubmitted = await enterEmailAndClickNext(page, email);
//       if (!emailSubmitted) {
//         await saveScreenshot(page, attempt, '03_email_field_disappeared');
//         return { success: false, message: 'Email input field disappeared before it could be filled. Check the latest screenshot in assets.' };
//       }
//       console.log('[DEBUG] URL after email Next: ' + page.url());
//       await saveScreenshot(page, attempt, '03_after_email_next');

//       if (await chooseWorkSchoolAccountIfPrompted(page)) {
//         console.log('[DEBUG] URL after Work or school choice: ' + page.url());
//         await saveScreenshot(page, attempt, '04_after_work_school_choice');
//       }

//       const usernameError = await page.$('#usernameError');
//       if (usernameError) {
//         await saveScreenshot(page, attempt, '04_username_error');
//         const errorText = await page.evaluate(el => el.textContent, usernameError);
//         return { success: false, message: 'Invalid username: ' + errorText };
//       }

//       if (page.url().includes('AADSTS')) {
//         await saveScreenshot(page, attempt, '04_aadsts_error');
//         return { success: false, message: 'User not found or error in URL' };
//       }

//       try {
//         await page.waitForSelector('#i0118', { timeout: 15000 });
//         await saveScreenshot(page, attempt, '04_password_field_found');
//       } catch {
//         await saveScreenshot(page, attempt, '04_password_field_missing');
//         return { success: false, message: 'Could not reach password field - account may not exist, may be blocked, or CAPTCHA triggered' };
//       }

//       await page.type('#i0118', password, { delay: 30 });
//       await clickMicrosoftNext(page);
//       await wait(3000);
//       await saveScreenshot(page, attempt, '05_after_password_next');

//       const passwordError = await page.$('#passwordError');
//       if (passwordError) {
//         await saveScreenshot(page, attempt, '06_password_error');
//         const errorText = await page.evaluate(el => el.textContent, passwordError);
//         return { success: false, message: 'Incorrect password: ' + errorText };
//       }

//       const genericError = await page.$('#idErrorMsg');
//       if (genericError) {
//         await saveScreenshot(page, attempt, '06_generic_login_error');
//         const errorText = await page.evaluate(el => el.textContent, genericError);
//         return { success: false, message: 'Login error: ' + errorText };
//       }

//       try {
//         await page.waitForSelector('#idBtn_Back', { timeout: 5000 });
//         await saveScreenshot(page, attempt, '06_stay_signed_in_prompt');
//         await page.click('#idBtn_Back');
//         await wait(1000);
//         await saveScreenshot(page, attempt, '07_after_stay_signed_in_no');
//       } catch {}

//       try {
//         await page.waitForFunction(
//           () => window.location.href.includes('account.microsoft.com'),
//           { timeout: config.timeout }
//         );
//         await saveScreenshot(page, attempt, '08_final_redirect');
//         const finalUrl = page.url();
//         const urlParams = new URL(finalUrl).searchParams;
//         const code = urlParams.get('code');
//         if (code) {
//           return { success: true, message: 'Login successful - authorization code obtained (' + code.substring(0, 20) + '...)' };
//         }
//         return { success: true, message: 'Login successful - redirected to account.microsoft.com' };
//       } catch {
//         await saveScreenshot(page, attempt, '08_unexpected_redirect');
//         return { success: false, message: 'Login incomplete - unexpected redirect: ' + page.url().substring(0, 200) };
//       }
//     } catch (err) {
//       console.log('[DEBUG] Attempt ' + attempt + ' failed: ' + err.message);
//       if (attempt < config.maxRetries) continue;
//       return { success: false, message: 'Browser automation error after ' + attempt + ' attempt(s): ' + err.message.substring(0, 200) };
//     } finally {
//       if (browser) { try { await browser.close(); } catch (_) {} }
//     }
//   }
//   return { success: false, message: 'All retry attempts exhausted' };
// }

// module.exports = { testLogin };



const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const assetsDir = path.join(__dirname, '..', 'assets');

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function saveScreenshot(page, attempt, label) {
  fs.mkdirSync(assetsDir, { recursive: true });
  await waitForDebugCapture(page);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = sanitizeFilename(label);
  const basePath = path.join(assetsDir, 'attempt_' + attempt + '_' + safeLabel + '_' + timestamp);
  const screenshotPath = basePath + '.png';
  const htmlPath = basePath + '.html';
  const metaPath = basePath + '.json';
  const metadata = await getPageDebugMetadata(page);

  await page.screenshot({ path: screenshotPath });
  fs.writeFileSync(htmlPath, await page.content(), 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log('[DEBUG] Screenshot saved: ' + screenshotPath);
  console.log('[DEBUG] Debug HTML saved: ' + htmlPath);
  console.log('[DEBUG] Debug metadata saved: ' + metaPath);
  return screenshotPath;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForDebugCapture(page) {
  await wait(1500);
  await page.waitForFunction(() => {
    return document.readyState === 'interactive' || document.readyState === 'complete';
  }, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => {
    return document.body && document.body.innerText.trim().length > 0;
  }, { timeout: 5000 }).catch(() => {});
}

async function getPageDebugMetadata(page) {
  return page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      bodyText: document.body ? document.body.innerText.trim().slice(0, 5000) : '',
      inputs: Array.from(document.querySelectorAll('input')).map((input) => ({
        id: input.id,
        name: input.name,
        type: input.type,
        valueLength: input.value ? input.value.length : 0,
        placeholder: input.placeholder,
        ariaLabel: input.getAttribute('aria-label'),
      })),
      buttons: Array.from(document.querySelectorAll('button, input[type="button"], div[role="button"], a')).map((button) => ({
        id: button.id,
        role: button.getAttribute('role'),
        type: button.type || '',
        text: (button.innerText || button.value || button.getAttribute('aria-label') || '').trim().slice(0, 200),
      })).filter((button) => button.id || button.text),
    };
  }).catch((err) => ({
    url: page.url(),
    error: err.message,
  }));
}

async function clickMicrosoftNext(page) {
  await page.waitForSelector('#idSIButton9', { visible: true, timeout: 15000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('#idSIButton9');
    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
  }, { timeout: 15000 });

  await page.evaluate(() => {
    const button = document.querySelector('#idSIButton9');
    button.scrollIntoView({ block: 'center', inline: 'center' });
  });

  console.log('[DEBUG] Clicking Next button');
  await page.click('#idSIButton9');
}

async function enterEmailAndClickNext(page, email) {
  const emailField = await page.waitForSelector('#i0116', { visible: true, timeout: 15000 }).catch(() => null);
  if (!emailField) {
    return false;
  }

  await emailField.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#i0116', email, { delay: 50 });

  await page.evaluate((value) => {
    const input = document.querySelector('#i0116');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, email);

  const currentUrl = page.url();
  await clickMicrosoftNext(page);
  await page.waitForFunction((previousUrl) => {
    const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
    return Boolean(
      document.querySelector('#i0118')
      || document.querySelector('#usernameError')
      || document.querySelector('#aadTile')
      || bodyText.includes('work or school')
      || bodyText.includes('personal account')
      || !document.querySelector('#i0116')
      || window.location.href !== previousUrl
    );
  }, { timeout: 10000 }, currentUrl).catch(() => {});

  const emailStillVisible = await page.$eval('#i0116', (input) => {
    const style = window.getComputedStyle(input);
    return style.visibility !== 'hidden' && style.display !== 'none' && input.offsetParent !== null;
  }).catch(() => false);
  const movedForward = await page.$('#i0118')
    || await page.$('#usernameError')
    || await page.$('#aadTile')
    || !emailStillVisible
    || page.url() !== currentUrl;

  if (!movedForward) {
    console.log('[DEBUG] Next click did not advance page, pressing Enter');
    const emailInput = await page.$('#i0116');
    if (!emailInput) {
      console.log('[DEBUG] Email field disappeared before Enter fallback; continuing');
      return true;
    }
    await emailInput.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((previousUrl) => {
      const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
      return Boolean(
        document.querySelector('#i0118')
        || document.querySelector('#usernameError')
        || document.querySelector('#aadTile')
        || bodyText.includes('work or school')
        || bodyText.includes('personal account')
        || !document.querySelector('#i0116')
        || window.location.href !== previousUrl
      );
    }, { timeout: 10000 }, currentUrl).catch(() => {});
  }

  return true;
}

async function chooseWorkSchoolAccountIfPrompted(page) {
  const aadTile = await page.$('#aadTile');
  if (aadTile) {
    console.log('[DEBUG] Account picker found, choosing Work or school account');
    await aadTile.click();
    await wait(2000);
    return true;
  }

  const clicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, div[role="button"], a, input[type="button"]'));
    const workSchoolOption = candidates.find((element) => {
      const text = (element.innerText || element.value || element.getAttribute('aria-label') || '').toLowerCase();
      return text.includes('work or school') || text.includes('work/school') || text.includes('work account');
    });

    if (!workSchoolOption) return false;
    workSchoolOption.scrollIntoView({ block: 'center', inline: 'center' });
    workSchoolOption.click();
    return true;
  });

  if (clicked) {
    console.log('[DEBUG] Account picker found by text, choosing Work or school account');
    await wait(2000);
  }

  return clicked;
}

async function detectMfaChallenge(page) {
  return page.evaluate(() => {
    const text = document.body ? document.body.innerText.toLowerCase() : '';
    const url = window.location.href.toLowerCase();
    return Boolean(
      text.includes('verify your identity')
      || text.includes('approve sign in request')
      || text.includes('enter code')
      || text.includes('authenticator')
      || text.includes('two-step verification')
      || text.includes('multi-factor authentication')
      || text.includes('additional security verification')
      || url.includes('sasem')
      || url.includes('proof')
    );
  }).catch(() => false);
}

function getAuthUrl(email) {
  const domain = email.split('@')[1];
  const personalDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
  
  const tenant = personalDomains.includes(domain) ? 'consumers' : 'organizations';
  
  return 'https://login.microsoftonline.com/' + "common" + '/oauth2/v2.0/authorize'
    + '?scope=service%3A%3Aaccount.microsoft.com%3A%3AMBI_SSL%20openid%20profile%20offline_access'
    + '&response_type=code'
    + '&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7'
    + '&redirect_uri=https%3A%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth'
    + '&prompt=login'
    + '&msaoauth2=true';
}

async function testLogin(email, password) {
  let browser = null;
  const authUrl = getAuthUrl(email);
  let accountType = 'unknown';

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }

    try {
      browser = await puppeteer.launch({
        headless: config.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1280,720',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        + 'AppleWebKit/537.36 (KHTML, like Gecko) '
        + 'Chrome/127.0.0.0 Safari/537.36'
      );

      console.log('[DEBUG] Navigating to auth URL...');
      await page.goto(authUrl, {
        waitUntil: 'networkidle2',
        timeout: config.timeout,
      });

      console.log('[DEBUG] Current URL: ' + page.url());
      await saveScreenshot(page, attempt, '01_auth_page_loaded');

      // Wait for either the email field OR an error page
      try {
        await page.waitForSelector('#i0116', { visible: true, timeout: 15000 });
        console.log('[DEBUG] Found email field');
        await saveScreenshot(page, attempt, '02_email_field_found');
      } catch {
        await saveScreenshot(page, attempt, '02_email_field_missing');
        console.log('[DEBUG] Page title: ' + await page.title());
        console.log('[DEBUG] Page URL: ' + page.url());
        
        // Check if we hit a different page
        if (page.url().includes('error')) {
          return { success: false, message: 'Microsoft returned an error page - possibly blocked or rate limited' };
        }
        if (page.url().includes('captcha') || page.url().includes('challenge')) {
          return { success: false, message: 'CAPTCHA or challenge page triggered - cannot automate' };
        }
        
        return { success: false, message: 'Could not find email input field - Microsoft may have changed their login page or blocked automation' };
      }

      const emailSubmitted = await enterEmailAndClickNext(page, email);
      if (!emailSubmitted) {
        await saveScreenshot(page, attempt, '03_email_field_disappeared');
        return { success: false, message: 'Email input field disappeared before it could be filled. Check the latest screenshot in assets.' };
      }
      console.log('[DEBUG] URL after email Next: ' + page.url());
      await saveScreenshot(page, attempt, '03_after_email_next');

      if (await chooseWorkSchoolAccountIfPrompted(page)) {
        accountType = 'business';
        console.log('[DEBUG] URL after Work or school choice: ' + page.url());
        await saveScreenshot(page, attempt, '04_after_work_school_choice');
      }

      const usernameError = await page.$('#usernameError');
      if (usernameError) {
        await saveScreenshot(page, attempt, '04_username_error');
        const errorText = await page.evaluate(el => el.textContent, usernameError);
        return { success: false, message: 'Invalid username: ' + errorText };
      }

      if (page.url().includes('AADSTS')) {
        await saveScreenshot(page, attempt, '04_aadsts_error');
        return { success: false, message: 'User not found or error in URL' };
      }

      try {
        await page.waitForSelector('#i0118', { timeout: 15000 });
        await saveScreenshot(page, attempt, '04_password_field_found');
      } catch {
        await saveScreenshot(page, attempt, '04_password_field_missing');
        return { success: false, message: 'Could not reach password field - account may not exist, may be blocked, or CAPTCHA triggered' };
      }

      await page.type('#i0118', password, { delay: 30 });
      await clickMicrosoftNext(page);
      await wait(3000);
      await saveScreenshot(page, attempt, '05_after_password_next');

      if (await detectMfaChallenge(page)) {
        await saveScreenshot(page, attempt, '06_mfa_challenge');
        return {
          success: false,
          status: 'mfa_required',
          accountType,
          mfaRequired: true,
          message: 'Multi-factor authentication or additional verification is required',
        };
      }

      const passwordError = await page.$('#passwordError');
      if (passwordError) {
        await saveScreenshot(page, attempt, '06_password_error');
        const errorText = await page.evaluate(el => el.textContent, passwordError);
        return { success: false, status: 'failed', accountType, mfaRequired: false, message: 'Incorrect password: ' + errorText };
      }

      const genericError = await page.$('#idErrorMsg');
      if (genericError) {
        await saveScreenshot(page, attempt, '06_generic_login_error');
        const errorText = await page.evaluate(el => el.textContent, genericError);
        return { success: false, status: 'failed', accountType, mfaRequired: false, message: 'Login error: ' + errorText };
      }

      try {
        await page.waitForSelector('#idBtn_Back', { timeout: 5000 });
        await saveScreenshot(page, attempt, '06_stay_signed_in_prompt');
        await page.click('#idBtn_Back');
        await wait(1000);
        await saveScreenshot(page, attempt, '07_after_stay_signed_in_no');
      } catch {}

      try {
        await page.waitForFunction(
          () => window.location.href.includes('account.microsoft.com'),
          { timeout: config.timeout }
        );
        await saveScreenshot(page, attempt, '08_final_redirect');
        const finalUrl = page.url();
        const urlParams = new URL(finalUrl).searchParams;
        const code = urlParams.get('code');
        if (code) {
          return { success: true, status: 'success', accountType, mfaRequired: false, message: 'Login successful - authorization code obtained (' + code.substring(0, 20) + '...)' };
        }
        return { success: true, status: 'success', accountType, mfaRequired: false, message: 'Login successful - redirected to account.microsoft.com' };
      } catch {
        await saveScreenshot(page, attempt, '08_unexpected_redirect');
        return { success: false, status: 'failed', accountType, mfaRequired: false, message: 'Login incomplete - unexpected redirect: ' + page.url().substring(0, 200) };
      }
    } catch (err) {
      console.log('[DEBUG] Attempt ' + attempt + ' failed: ' + err.message);
      if (attempt < config.maxRetries) continue;
      return { success: false, message: 'Browser automation error after ' + attempt + ' attempt(s): ' + err.message.substring(0, 200) };
    } finally {
      if (browser) { try { await browser.close(); } catch (_) {} }
    }
  }
  return { success: false, message: 'All retry attempts exhausted' };
}

module.exports = { testLogin };
