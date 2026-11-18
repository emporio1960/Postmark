// Shareable card links. The whole card travels inside the link itself
// (compressed into the URL fragment), so no server ever sees it.
import type { CardDoc, CardElement, Face } from '../types';
import { uid } from './utils';

const MAX_LINK_LENGTH = 7000;

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

const round = (_k: string, v: unknown) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);

function slimFace(f: Face) {
  return { ...f, elements: f.elements.map((e) => { const { id: _id, ...rest } = e; return rest; }) };
}

/** Encode a card for a link. Returns null if it is too large (e.g. it contains photos). */
export async function encodeCard(doc: CardDoc): Promise<string | null> {
  const json = JSON.stringify({ o: doc.orientation, f: slimFace(doc.front), i: slimFace(doc.inside) }, round);
  const raw = new TextEncoder().encode(json);
  let out: string;
  try {
    if (typeof CompressionStream === 'undefined') throw new Error('no compression');
    out = 'z' + toB64Url(await pipe(raw, new CompressionStream('deflate-raw')));
  } catch {
    out = 'j' + toB64Url(raw);
  }
  return out.length > MAX_LINK_LENGTH ? null : out;
}

const ORIENTATIONS = ['portrait', 'landscape', 'square'];
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function cleanFace(f: unknown): Face {
  const face = f as Face;
  if (!face || typeof face !== 'object' || !Array.isArray(face.elements) || !face.background) throw new Error('bad face');
  const elements: CardElement[] = [];
  for (const raw of face.elements.slice(0, 80)) {
    const e = raw as CardElement;
    if (!e || typeof e !== 'object') continue;
    const base = { ...e, id: uid(), x: num(e.x), y: num(e.y), w: num(e.w, 100) };
    if (e.type === 'text' && typeof e.text === 'string') elements.push({ ...base, text: e.text.slice(0, 2000) } as CardElement);
    else if (e.type === 'sticker' && typeof e.kind === 'string') elements.push(base as CardElement);
    // Only inline images are ever accepted – a link can never make the app fetch a remote file.
    else if (e.type === 'image' && typeof e.src === 'string' && e.src.startsWith('data:image/')) elements.push(base as CardElement);
  }
  return {
    background: face.background,
    art: { kind: face.art?.kind ?? 'none', palette: Array.isArray(face.art?.palette) ? face.art.palette.slice(0, 8).map(String) : [], seed: num(face.art?.seed, 1) },
    border: { kind: face.border?.kind ?? 'none', color: String(face.border?.color ?? '#C2A05A'), inset: num(face.border?.inset, 44) },
    elements,
  };
}

/** Decode a card from a link payload. Throws if the link is damaged. */
export async function decodeCard(payload: string): Promise<CardDoc> {
  const kind = payload[0], body = fromB64Url(payload.slice(1));
  const bytes = kind === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  const data = JSON.parse(new TextDecoder().decode(bytes)) as { o: string; f: unknown; i: unknown };
  if (!ORIENTATIONS.includes(data.o)) throw new Error('bad orientation');
  return { orientation: data.o as CardDoc['orientation'], front: cleanFace(data.f), inside: cleanFace(data.i) };
}

/** A link that opens this card in the viewer, or null when the card is too large for a link. */
export async function cardLink(doc: CardDoc): Promise<string | null> {
  const payload = await encodeCard(doc);
  return payload ? `${location.origin}${location.pathname}#card=${payload}` : null;
}
