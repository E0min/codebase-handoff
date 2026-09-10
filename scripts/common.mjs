import { access } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export function options(allowed) {
  const result = { appendix: [] };
  const args = process.argv.slice(2);
  while (args.length) {
    const flag = args.shift();
    if (!flag?.startsWith('--') || !allowed.includes(flag.slice(2))) throw new Error(`Unknown option: ${flag}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value: ${flag}`);
    if (flag === '--appendix') result.appendix.push(path.resolve(value));
    else result[flag.slice(2)] = value;
  }
  return result;
}

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function launch(browserPath) {
  const executablePath = browserPath || process.env.CHROME_PATH;
  if (!executablePath) throw new Error('Set CHROME_PATH or pass --browser with a Chrome/Chromium executable path. Browser validation has not run.');
  await access(executablePath);
  return puppeteer.launch({ executablePath, headless: true });
}
