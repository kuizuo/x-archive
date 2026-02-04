/**
 * 爬虫配置入口
 * 支持 --curl / --curl-file / --max / --page-size / --delay
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCurl } from './parse-curl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_TWEETS: 20,
  DELAY_MS: 1000,
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--curl') {
      args.curl = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--curl=')) {
      args.curl = arg.slice('--curl='.length);
      continue;
    }
    if (arg === '--curl-file') {
      args.curlFile = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--curl-file=')) {
      args.curlFile = arg.slice('--curl-file='.length);
      continue;
    }
    if (arg === '--max') {
      args.max = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--max=')) {
      args.max = arg.slice('--max='.length);
      continue;
    }
    if (arg === '--page-size') {
      args.pageSize = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--page-size=')) {
      args.pageSize = arg.slice('--page-size='.length);
      continue;
    }
    if (arg === '--delay') {
      args.delay = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--delay=')) {
      args.delay = arg.slice('--delay='.length);
      continue;
    }
  }
  return args;
}

function readCurlInput(args) {
  if (args.curl) {
    return args.curl;
  }

  const curlFilePath = args.curlFile
    ? path.resolve(process.cwd(), args.curlFile)
    : path.join(__dirname, 'curl.txt');

  if (fs.existsSync(curlFilePath)) {
    return fs.readFileSync(curlFilePath, 'utf-8');
  }

  throw new Error(
    [
      '未找到 cURL 输入。',
      '请复制 Network 中 UserTweets 请求为 cURL 并保存到 script/curl.txt，',
      '或通过 --curl / --curl-file 传入。',
    ].join('')
  );
}

function coerceInt(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`无效的 ${label}：${value}`);
  }
  return parsed;
}

function applyHeaderDefaults(headers) {
  if (!headers['user-agent']) {
    headers['user-agent'] = DEFAULT_USER_AGENT;
  }
  if (!headers.accept) {
    headers.accept = '*/*';
  }
  return headers;
}

function ensureRequired({ headers, variables, url }) {
  const missing = [];
  if (!url) missing.push('url');
  if (!headers.authorization) missing.push('authorization');
  if (!headers.cookie) missing.push('cookie');
  if (!headers['x-csrf-token']) missing.push('x-csrf-token');

  if (!variables.userId && !variables.user_id) {
    missing.push('userId');
  }

  if (missing.length > 0) {
    throw new Error(
      [
        `cURL 缺少关键信息：${missing.join(', ')}`,
        '请确认复制的是 UserTweets 请求 (Network → UserTweets → Copy as cURL)。',
      ].join(' ')
    );
  }
}

function hydrateCsrfFromCookie(headers) {
  if (headers['x-csrf-token'] || !headers.cookie) return headers;
  const match = headers.cookie.match(/ct0=([^;]+)/);
  if (match) {
    headers['x-csrf-token'] = match[1];
  }
  return headers;
}

export function loadCrawlConfig(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const curlInput = readCurlInput(args);
  const parsed = parseCurl(curlInput);

  const headers = hydrateCsrfFromCookie({ ...parsed.headers });
  applyHeaderDefaults(headers);
  ensureRequired({ headers, variables: parsed.variables, url: parsed.url });

  const userId = parsed.variables.userId ?? parsed.variables.user_id;
  const countFromCurl = coerceInt(parsed.variables.count, 'variables.count');
  const pageSize = coerceInt(args.pageSize, '--page-size') ?? countFromCurl ?? DEFAULTS.PAGE_SIZE;
  const maxTweets = coerceInt(args.max, '--max') ?? DEFAULTS.MAX_TWEETS;
  const delayMs = coerceInt(args.delay, '--delay') ?? DEFAULTS.DELAY_MS;

  const config = {
    ENDPOINT: parsed.endpoint,
    USER_ID: String(userId),
    PAGE_SIZE: pageSize,
    MAX_TWEETS: maxTweets,
    DELAY_MS: delayMs,
    OUTPUT_DIR: path.join(__dirname, '../public'),
  };

  return {
    headers,
    config,
    endpoint: parsed.endpoint,
  };
}
