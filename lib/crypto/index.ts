// Cifra da autoria anónima (secções 5 e 14).
// Implementação síncrona e isomórfica (servidor e browser) com primitivas normalizadas:
//   - SHA-256 e HMAC-SHA256 (FIPS 180-4 / RFC 2104)
//   - cifra encrypt-then-MAC: fluxo HMAC-SHA256 em modo contador + etiqueta HMAC
// A chave vem de ANON_KEY (modo completo). Ver DECISOES.md, D-07.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const len = data.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[len] = 0x80;
  const bits = len * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bits / 2 ** 32));
  view.setUint32(padded.length - 4, bits >>> 0);
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}
const ror = (x: number, n: number) => (x >>> n) | (x << (32 - n));

const enc = new TextEncoder();
const dec = new TextDecoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (s: string) => new Uint8Array((s.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)));

export function hmac(key: Uint8Array, msg: Uint8Array): Uint8Array {
  let k = key.length > 64 ? sha256(key) : key;
  const block = new Uint8Array(64);
  block.set(k);
  const ipad = block.map((x) => x ^ 0x36);
  const opad = block.map((x) => x ^ 0x5c);
  return sha256(concat(opad, sha256(concat(ipad, msg))));
}

function masterKey(): Uint8Array {
  const raw =
    (typeof process !== "undefined" && process.env?.ANON_KEY) ||
    // Chave pública apenas para a demonstração estática; o modo completo exige ANON_KEY.
    "demo-only-anon-key-not-for-production";
  return sha256(enc.encode(raw));
}
const subKey = (label: string) => hmac(masterKey(), enc.encode(label));

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

function keystream(key: Uint8Array, iv: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0, ctr = 0; i < length; ctr++) {
    const blk = hmac(key, concat(iv, new Uint8Array([ctr >>> 24, ctr >>> 16, ctr >>> 8, ctr])));
    out.set(blk.subarray(0, Math.min(32, length - i)), i);
    i += 32;
  }
  return out;
}

/** Cifra um texto (id do utilizador, email). Resultado: v1.<iv>.<cifra>.<etiqueta> */
export function seal(plain: string): string {
  const iv = randomBytes(16);
  const p = enc.encode(plain);
  const ks = keystream(subKey("enc"), iv, p.length);
  const c = p.map((x, i) => x ^ ks[i]);
  const tag = hmac(subKey("mac"), concat(iv, c));
  return `v1.${toHex(iv)}.${toHex(c)}.${toHex(tag)}`;
}

export function open(sealed: string): string | null {
  const [v, ivh, ch, tagh] = sealed.split(".");
  if (v !== "v1" || !ivh || ch === undefined || !tagh) return null;
  const iv = fromHex(ivh), c = fromHex(ch);
  const expected = toHex(hmac(subKey("mac"), concat(iv, c)));
  if (!timingSafeEqual(expected, tagh)) return null;
  const ks = keystream(subKey("enc"), iv, c.length);
  return dec.decode(c.map((x, i) => x ^ ks[i]));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Referência de pesquisa (não reversível) para o colaborador encontrar as suas ideias anónimas. */
export const lookupRef = (userId: string) => toHex(hmac(subKey("lookup"), enc.encode(userId)));

/** Hash do código de acompanhamento (o código em claro nunca é guardado). */
export const hashTrackingCode = (code: string) =>
  toHex(hmac(subKey("code"), enc.encode(normalizeCode(code))));

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O/1/I/L para evitar confusões
export function generateTrackingCode(): string {
  const b = randomBytes(8);
  const chars = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
  return `ECO-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export const sha256Hex = (s: string) => toHex(sha256(enc.encode(s)));
