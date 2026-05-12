/* background.js - Service Worker */

// Offline PRO key validation (same algorithm as web app)
const PRO_SECRET = 'KINDLE-EXPORTER-PRO-2024'.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

function validateProKeyOffline(key) {
  const parts = key.split('-');
  if (parts.length !== 5 || parts[0] !== 'KINDLE') return false;
  for (let i = 1; i < 5; i++) {
    if (parts[i].length !== 4 || !/^\d{4}$/.test(parts[i])) return false;
  }
  const str = parts.slice(1, 4).join('');
  let s = 0;
  for (let i = 0; i < str.length; i++) s += str.charCodeAt(i) * (i + 1);
  s ^= PRO_SECRET;
  return parts[4] === String(s % 10).repeat(4);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VERIFY_LICENSE') {
    verifyGumroadLicense(request.key)
      .then(result => sendResponse(result))
      .catch(() => {
        // Fallback to offline validation
        const valid = validateProKeyOffline(request.key);
        sendResponse({ valid, email: valid ? 'offline' : '' });
      });
    return true;
  }
});

async function verifyGumroadLicense(key) {
  const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      product_id: '0yHNE5LuJrYRgIh7pCfCiQ==',
      license_key: key,
    }),
  });

  const data = await resp.json();
  if (data.success && data.uses !== undefined && data.uses < 5) {
    await fetch('https://api.gumroad.com/v2/licenses/increment_uses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: '0yHNE5LuJrYRgIh7pCfCiQ==',
        license_key: key,
      }),
    });
    return { valid: true, email: data.purchase.email };
  }
  return { valid: false };
}
