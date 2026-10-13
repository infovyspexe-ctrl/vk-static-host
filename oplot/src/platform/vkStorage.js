// VK values are bounded. Publish a manifest only after every new part is stored;
// an interrupted write must leave the previous complete save readable.
const ROOT = 'save';
const FORMAT = 'oplot-vk-chunks-1';
const LIMIT = 3000;
const MAX_PARTS = 192;
const encoder = new TextEncoder();
const pendingCommits = new WeakMap();
async function send(bridge, method, params) {
  let timer;
  const commit = method === 'VKWebAppStorageSet' && params.key === ROOT;
  if (commit && pendingCommits.has(bridge)) throw new Error('VK previous commit still pending');
  const request = Promise.resolve().then(() => bridge.send(method, params));
  if (commit) {
    pendingCommits.set(bridge, request);
    const release = () => { if (pendingCommits.get(bridge) === request) pendingCommits.delete(bridge); };
    request.then(release, release);
  }
  try {
    return await Promise.race([request, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('VK storage timeout')), 12000);
    })]);
  } finally { clearTimeout(timer); }
}

export function splitSave(text) {
  const parts = [];
  let part = '', size = 2;
  for (const char of text) {
    const cost = encoder.encode(JSON.stringify(char)).length - 2;
    if (size + cost > LIMIT) { parts.push(part); part = ''; size = 2; }
    part += char; size += cost;
  }
  if (part) parts.push(part);
  if (parts.length > MAX_PARTS) throw new Error('VK save too large');
  return parts;
}

function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
function manifest(value) {
  if (value?.format !== FORMAT) return false;
  if (!/^[a-z0-9_-]{1,80}$/.test(value.generation) || !Number.isInteger(value.parts) ||
      value.parts < 1 || value.parts > MAX_PARTS || !Number.isSafeInteger(value.length) ||
      value.length < 1 || typeof value.checksum !== 'string') throw new Error('Invalid VK manifest');
  return true;
}
const keyFor = (m, i) => `oplot_${m.generation}_${i}`;
async function get(bridge, keys) {
  const res = await send(bridge, 'VKWebAppStorageGet', { keys });
  if (!Array.isArray(res?.keys)) throw new Error('Invalid VK storage response');
  return new Map(res.keys.map(entry => [entry.key, entry.value]));
}
async function set(bridge, key, value) {
  const res = await send(bridge, 'VKWebAppStorageSet', { key, value });
  if (res?.result !== true) throw new Error('VK storage rejected write');
}
async function root(bridge) {
  const entries = await get(bridge, [ROOT]);
  if (!entries.has(ROOT)) throw new Error('VK save key missing from response');
  const raw = entries.get(ROOT);
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid VK save');
  return value;
}

export async function readVkSave(bridge) {
  const value = await root(bridge);
  if (!manifest(value)) return value; // Existing one-key saves migrate on the next write.
  const chunks = [];
  for (let start = 0; start < value.parts; start += 32) {
    const keys = Array.from({ length: Math.min(32, value.parts - start) }, (_, i) => keyFor(value, start + i));
    const entries = await get(bridge, keys);
    for (const key of keys) {
      const part = entries.get(key);
      if (typeof part !== 'string' || !part.length) throw new Error('Incomplete VK save');
      chunks.push(part);
    }
  }
  const text = chunks.join('');
  if (text.length !== value.length || checksum(text) !== value.checksum) throw new Error('Damaged VK save');
  const payload = JSON.parse(text);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid VK payload');
  return payload;
}

export async function writeVkSave(bridge, payload) {
  // Timeout is not cancellation. Until the outstanding root request actually
  // settles, a newer write could be overwritten by its late completion.
  if (pendingCommits.has(bridge)) throw new Error('VK previous commit still pending');
  const previous = await root(bridge);
  const hasPrevious = manifest(previous);
  const text = JSON.stringify(payload), parts = splitSave(text);
  // Old builds with SAVE_VERSION=1 see a future root and must not overwrite it.
  const next = { _v: 2, savedAt: Number(payload.savedAt) || Date.now(), format: FORMAT,
    generation: `${Date.now().toString(36)}_${Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join('_')}`,
    parts: parts.length, length: text.length, checksum: checksum(text) };
  // Unique part keys also prevent a late response from an older attempt corrupting
  // a newer save. Failed attempts never change the root pointer.
  for (let i = 0; i < parts.length; i++) await set(bridge, keyFor(next, i), parts[i]);
  await set(bridge, ROOT, JSON.stringify(next));
  // Reclaim the previous generation only after the new pointer is acknowledged.
  // Cleanup failure does not turn an already committed save into a failed one.
  if (hasPrevious) for (let i = 0; i < previous.parts; i++) {
    try { await set(bridge, keyFor(previous, i), ''); } catch { break; }
  }
  return true;
}
