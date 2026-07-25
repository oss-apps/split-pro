import { TextDecoder, TextEncoder } from 'node:util';

/*
 * The Prisma `client` (WASM) engine needs TextEncoder/TextDecoder at import time, but
 * jsdom doesn't provide them. Polyfill from Node's util module so test suites that import
 * anything touching the Prisma client (e.g. `@prisma/client` types) can load under jsdom.
 */
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
