/**
 * 解析 cURL 文本，提取 URL、headers、variables
 */

const IGNORED_HEADERS = new Set([
  'host',
  'authority',
  'connection',
  'content-length',
  'accept-encoding',
]);

function normalizeKey(key) {
  return key.trim().toLowerCase();
}

function unescapeDollarString(input) {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, '\'')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function findUrl(raw) {
  const direct =
    raw.match(/curl\s+(['"])(https?:\/\/.*?)\1/i) ||
    raw.match(/--url\s+(['"])(https?:\/\/.*?)\1/i);
  if (direct) {
    return direct[2];
  }

  const plain =
    raw.match(/curl\s+(https?:\/\/\S+)/i) ||
    raw.match(/--url\s+(https?:\/\/\S+)/i);
  if (plain) {
    return plain[1];
  }

  const firstHttp = raw.match(/https?:\/\/[^\s'"]+/i);
  return firstHttp ? firstHttp[0] : '';
}

function parseHeaders(raw) {
  const headers = {};
  const headerRegex = /(?:-H|--header)\s+(\$?['"])(.*?)\1/g;
  let match = null;
  while ((match = headerRegex.exec(raw))) {
    const quoteToken = match[1];
    let line = match[2];
    if (quoteToken.startsWith('$')) {
      line = unescapeDollarString(line);
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = normalizeKey(line.slice(0, idx));
    const value = line.slice(idx + 1).trim();
    if (!value || IGNORED_HEADERS.has(key)) continue;
    headers[key] = value;
  }

  return headers;
}

function parseVariables(url) {
  if (!url) return {};
  try {
    const urlObj = new URL(url);
    const variablesParam = urlObj.searchParams.get('variables');
    if (!variablesParam) return {};
    try {
      return JSON.parse(variablesParam);
    } catch {
      return JSON.parse(decodeURIComponent(variablesParam));
    }
  } catch {
    return {};
  }
}

export function parseCurl(raw) {
  const cleaned = raw
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const url = findUrl(cleaned);
  const headers = parseHeaders(cleaned);
  const variables = parseVariables(url);
  let endpoint = '';
  if (url) {
    const urlObj = new URL(url);
    endpoint = `${urlObj.origin}${urlObj.pathname}`;
  }

  return {
    url,
    endpoint,
    headers,
    variables,
  };
}
