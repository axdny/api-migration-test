/**
 * Mock "Legacy" and "Core" marketplace APIs (zero dependencies).
 *
 * Two HTTP servers expose the same fictional endpoints so the test framework can
 * be demonstrated without any real backend:
 *
 *   Legacy  http://localhost:4011   (the system being migrated away from)
 *   Core    http://localhost:4010   (the new implementation)
 *
 * Core intentionally diverges from Legacy on a few endpoints (see "KNOWN DIVERGENCES")
 * so the comparison engine has something real to detect.
 *
 * Usage:
 *   node mock/server.mjs                 # start both servers
 *   import { startMock } from './mock/server.mjs'   # start programmatically
 */
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = {
  corePort: Number(process.env.MOCK_CORE_PORT ?? 4010),
  legacyPort: Number(process.env.MOCK_LEGACY_PORT ?? 4011),
  // Artificial latency (ms) so the performance comparison has something to report.
  legacyLatencyMs: Number(process.env.MOCK_LEGACY_LATENCY_MS ?? 5),
  coreLatencyMs: Number(process.env.MOCK_CORE_LATENCY_MS ?? 15),
  demoUser: process.env.TEST_USER ?? 'qa.user@example.com',
  demoPassword: process.env.TEST_PASSWORD ?? 'Demo#Pass123',
};

// ---------------------------------------------------------------------------
// Fictional data
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { Id: 1, Name: 'Trucks', ItemCount: 128 },
  { Id: 2, Name: 'Trailers', ItemCount: 74 },
  { Id: 3, Name: 'Tractors', ItemCount: 203 },
  { Id: 4, Name: 'Excavators', ItemCount: 56 },
  { Id: 5, Name: 'Forklifts', ItemCount: 91 },
];

const LISTINGS = {
  1001: {
    Id: 1001,
    Title: '2018 Heavy Duty Truck',
    Price: 48500,
    OwnerId: 'usr-0001',
    CategoryId: 1,
  },
  1002: {
    Id: 1002,
    Title: 'Flatbed Trailer 40ft',
    Price: 17250,
    OwnerId: 'usr-0002',
    CategoryId: 2,
  },
  1003: {
    Id: 1003,
    Title: 'Compact Tractor 35HP',
    Price: 22900,
    OwnerId: 'usr-0003',
    CategoryId: 3,
  },
  1004: {
    Id: 1004,
    Title: 'Mini Excavator 3.5t',
    Price: 31800,
    OwnerId: 'usr-0001',
    CategoryId: 4,
  },
  1005: {
    Id: 1005,
    Title: 'Electric Forklift 2t',
    Price: 12400,
    OwnerId: 'usr-0004',
    CategoryId: 5,
  },
};

const REGISTERED = new Set(['taken@example.com']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(res, status, body) {
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function parseBody(raw, contentType = '') {
  if (!raw) return {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const UNAUTHORIZED = { Message: 'Authorization has been denied for this request.' };

function isAuthorized(req, issuedTokens) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return issuedTokens.has(token);
}

function newToken(issuedTokens) {
  const token = `mock-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  issuedTokens.add(token);
  return token;
}

// ---------------------------------------------------------------------------
// Server factory — `flavour` decides which behaviour ("legacy" | "core") is served
// ---------------------------------------------------------------------------
function createApi(flavour, options) {
  const issuedTokens = new Set();
  const latency = flavour === 'core' ? options.coreLatencyMs : options.legacyLatencyMs;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    const method = req.method ?? 'GET';
    await sleep(latency);

    // ---- Health ---------------------------------------------------------
    if (method === 'GET' && path === '/api/health') {
      return send(res, 200, { Status: 'Healthy' });
    }

    // ---- Token ----------------------------------------------------------
    // Legacy: POST /Token (form-encoded, OAuth2 password grant style)
    // Core:   POST /api/auth/token (JSON body)
    const isLegacyToken = flavour === 'legacy' && method === 'POST' && path === '/token';
    const isCoreToken = flavour === 'core' && method === 'POST' && path === '/api/auth/token';
    if (isLegacyToken || isCoreToken) {
      const body = parseBody(await readBody(req), req.headers['content-type']);
      const user = body.username ?? '';
      const pass = body.password ?? '';
      if (user !== options.demoUser || pass !== options.demoPassword) {
        return send(res, 400, {
          error: 'invalid_grant',
          error_description: 'The user name or password is incorrect.',
        });
      }
      const issued = new Date();
      const expires = new Date(issued.getTime() + 3600 * 1000);
      const token = newToken(issuedTokens);
      return send(res, 200, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        userName: user,
        '.issued': issued.toUTCString(),
        '.expires': expires.toUTCString(),
      });
    }

    // ---- Listing: categories (auth required) ------------------------------
    if (method === 'GET' && path === '/api/listing/getcategories') {
      if (!isAuthorized(req, issuedTokens)) return send(res, 401, UNAUTHORIZED);
      const text = (url.searchParams.get('text') ?? '').toLowerCase();
      const data = CATEGORIES.filter((c) => c.Name.toLowerCase().includes(text));
      return send(res, 200, { Success: true, Data: data });
    }

    // ---- Listing: detail (public) ----------------------------------------
    if (method === 'GET' && path === '/api/listing/getlistingdetail') {
      const id = url.searchParams.get('id') ?? '';
      if (id === '') return send(res, 404); // empty body on purpose
      const listing = LISTINGS[id];
      if (!listing) return send(res, 404, { Success: false, Message: 'Listing not found.' });

      const detail = {
        ...listing,
        ListingDetailLink: `/listings/detail/${listing.Id}`,
        DateCreated: new Date().toISOString(), // dynamic on purpose: ignored by the value diff
      };

      // KNOWN DIVERGENCES (Core vs Legacy) -------------------------------------
      //  1. OwnerId is returned as null by Core.
      //  2. The link property is camelCase in Core ("listingDetailLink").
      if (flavour === 'core') {
        const { ListingDetailLink, ...rest } = detail;
        return send(res, 200, {
          Success: true,
          Data: { ...rest, OwnerId: null, listingDetailLink: ListingDetailLink },
        });
      }
      return send(res, 200, { Success: true, Data: detail });
    }

    // ---- Account: register -------------------------------------------------
    if (method === 'POST' && path === '/api/account/register') {
      const body = parseBody(await readBody(req), req.headers['content-type']);
      const { email = '', password = '', confirmPassword = '' } = body;
      const fieldErrors = {};
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        fieldErrors.Email = 'The Email field is not valid.';
      if (password.length < 8)
        fieldErrors.Password = 'The Password must be at least 8 characters long.';
      else if (password !== confirmPassword) {
        fieldErrors.ConfirmPassword = 'The password and confirmation password do not match.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        return send(res, 400, {
          Success: false,
          Message: 'The request is invalid.',
          FieldErrors: fieldErrors,
        });
      }
      if (REGISTERED.has(email.toLowerCase())) {
        return send(res, 400, { Success: false, Message: 'Email is already registered.' });
      }
      return send(res, 200, { Success: true, Message: 'Registration successful.' });
    }

    return send(res, 404, { Success: false, Message: `No route for ${method} ${url.pathname}` });
  });
}

/**
 * Starts both mock servers. Resolves with a `stop()` function.
 */
export async function startMock(overrides = {}) {
  const options = { ...DEFAULTS, ...overrides };
  const core = createApi('core', options);
  const legacy = createApi('legacy', options);

  await Promise.all([
    new Promise((resolve, reject) => {
      core.once('error', reject);
      core.listen(options.corePort, resolve);
    }),
    new Promise((resolve, reject) => {
      legacy.once('error', reject);
      legacy.listen(options.legacyPort, resolve);
    }),
  ]);

  return {
    coreUrl: `http://localhost:${options.corePort}`,
    legacyUrl: `http://localhost:${options.legacyPort}`,
    stop: () =>
      Promise.all([
        new Promise((resolve) => core.close(resolve)),
        new Promise((resolve) => legacy.close(resolve)),
      ]),
  };
}

// Run standalone: `node mock/server.mjs`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { coreUrl, legacyUrl } = await startMock();
  console.log(`Mock Core API   -> ${coreUrl}`);
  console.log(`Mock Legacy API -> ${legacyUrl}`);
  console.log(`Demo credentials: ${DEFAULTS.demoUser} / ${DEFAULTS.demoPassword}`);
}
