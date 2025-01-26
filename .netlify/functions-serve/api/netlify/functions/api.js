var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// netlify/functions/utils/gas.js
var require_gas = __commonJS({
  "netlify/functions/utils/gas.js"(exports2, module2) {
    var fetch = require("node-fetch");
    var GAS_URL = process.env.GAS_URL;
    var GAS_API_KEY = process.env.GAS_API_KEY;
    async function fetchGas2(action, data = null) {
      try {
        const url = new URL(GAS_URL);
        const options = {
          method: data ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": GAS_API_KEY
          }
        };
        if (data) {
          options.body = JSON.stringify({
            action,
            data
          });
        } else {
          url.searchParams.append("action", action);
        }
        const response = await fetch(url.toString(), options);
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }
        return {
          success: true,
          data: responseData.data || responseData
        };
      } catch (error) {
        console.error(`GAS Error (${action}):`, error);
        return {
          success: false,
          error: error.message || "Internal server error"
        };
      }
    }
    module2.exports = { fetchGas: fetchGas2 };
  }
});

// netlify/functions/utils/auth.js
var require_auth = __commonJS({
  "netlify/functions/utils/auth.js"(exports2, module2) {
    var jwt = require("jsonwebtoken");
    var cookie = require("cookie");
    var JWT_SECRET = process.env.JWT_SECRET;
    var TOKEN_EXPIRY = "24h";
    function generateToken(payload) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    }
    function verifyToken2(token) {
      try {
        return jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return null;
      }
    }
    function getTokenFromRequest2(event) {
      const authHeader = event.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
      }
      const cookies = cookie.parse(event.headers.cookie || "");
      return cookies.token;
    }
    function createAuthCookie(token) {
      return cookie.serialize("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 86400
        // 24 hours
      });
    }
    module2.exports = {
      generateToken,
      verifyToken: verifyToken2,
      getTokenFromRequest: getTokenFromRequest2,
      createAuthCookie
    };
  }
});

// netlify/functions/utils/response.js
var require_response = __commonJS({
  "netlify/functions/utils/response.js"(exports2, module2) {
    function createResponse2(statusCode, data, options = {}) {
      const isDev = process.env.NODE_ENV === "development";
      const allowedOrigins = isDev ? ["*"] : process.env.ALLOWED_ORIGINS?.split(",") || [];
      const origin2 = options.origin || "*";
      const headers = {
        "Access-Control-Allow-Origin": isDev ? "*" : allowedOrigins.includes(origin2) ? origin2 : allowedOrigins[0],
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Credentials": "true",
        "Content-Type": "application/json",
        ...options.headers
      };
      return {
        statusCode,
        headers,
        body: JSON.stringify(data)
      };
    }
    module2.exports = { createResponse: createResponse2 };
  }
});

// netlify/functions/api.js
var { fetchGas } = require_gas();
var { verifyToken, getTokenFromRequest } = require_auth();
var { createResponse } = require_response();
var PROTECTED_ROUTES = ["checkin", "delivery"];
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return createResponse(204);
  }
  try {
    const path = event.path.replace(/^\/api\/|^\/.netlify\/functions\/api\/?/, "").split("/")[0];
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : null;
    const origin2 = event.headers.origin;
    console.log("Request path:", path);
    if (PROTECTED_ROUTES.includes(path)) {
      const token = getTokenFromRequest(event);
      if (!token) {
        return createResponse(401, {
          success: false,
          error: "Authentication required"
        }, { origin: origin2 });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return createResponse(401, {
          success: false,
          error: "Invalid or expired token"
        }, { origin: origin2 });
      }
    }
    let gasAction;
    let gasData = null;
    switch (path) {
      case "branches":
        gasAction = "getBranchConfig";
        break;
      case "vehicles":
        gasAction = "getVehicleData";
        gasData = { branch: params.branch };
        break;
      case "invoices":
        gasAction = "getInvoiceList";
        gasData = {
          branch: params.branch,
          date: params.date
        };
        break;
      case "login":
        gasAction = "login";
        gasData = body?.data;
        break;
      case "register":
        gasAction = "register";
        gasData = body?.data;
        break;
      case "checkin":
        gasAction = "submitCheckIn";
        gasData = body?.data;
        break;
      case "delivery":
        gasAction = "submitForm";
        gasData = body?.data;
        break;
      default:
        console.log("Path not found:", path);
        return createResponse(404, {
          success: false,
          error: "Not found"
        }, { origin: origin2 });
    }
    const gasResponse = await fetchGas(gasAction, gasData);
    if (!gasResponse.success) {
      return createResponse(500, gasResponse, { origin: origin2 });
    }
    return createResponse(200, gasResponse, { origin: origin2 });
  } catch (error) {
    console.error("API Error:", error);
    return createResponse(500, {
      success: false,
      error: error.message || "Internal server error"
    }, { origin });
  }
};
//# sourceMappingURL=api.js.map
