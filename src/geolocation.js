/**
 * Get client IP address from request headers
 * Handles various proxy scenarios (Cloudflare, nginx, etc.)
 */
function getClientIP(req) {
  if (!req) return null;

  // Try Cloudflare header first
  if (req.headers["cf-connecting-ip"]) {
    return req.headers["cf-connecting-ip"];
  }

  // Try X-Forwarded-For (might contain multiple IPs, take the first)
  if (req.headers["x-forwarded-for"]) {
    return req.headers["x-forwarded-for"].split(",")[0].trim();
  }

  // Try other common proxy headers
  if (req.headers["x-real-ip"]) {
    return req.headers["x-real-ip"];
  }

  // Fallback to socket connection IP
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return null;
}

/**
 * Get approximate location based on IP using a free GeoIP service
 * Returns { country, city, latitude, longitude }
 */
async function getLocationFromIP(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return {
      country: "Local/Unknown",
      city: "Local",
      latitude: null,
      longitude: null,
      isp: "Local",
    };
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`GeoIP API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      country: data.country_name || "Unknown",
      city: data.city || "Unknown",
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.org || "Unknown",
      timezone: data.timezone || "Unknown",
    };
  } catch (error) {
    console.error("[v0] Error fetching geolocation:", error.message);
    return {
      country: "Unknown",
      city: "Unknown",
      latitude: null,
      longitude: null,
      isp: "Unknown",
      timezone: "Unknown",
    };
  }
}

/**
 * Get complete geolocation info for a request
 */
async function getGeoInfo(req) {
  const ip = getClientIP(req);
  const location = await getLocationFromIP(ip);

  return {
    ip,
    ...location,
  };
}

module.exports = {
  getClientIP,
  getLocationFromIP,
  getGeoInfo,
};
