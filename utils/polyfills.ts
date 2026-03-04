// Mock implementation for Node.js modules not available in browser
// Used by Vite alias resolution

export const resolve = (...args: string[]) => args.join('/');
export const join = (...args: string[]) => args.join('/');
export const basename = (p: string) => p.split('/').pop() || '';
export const dirname = (p: string) => p.split('/').slice(0, -1).join('/') || '.';
export const extname = (p: string) => {
  const parts = p.split('.');
  return parts.length > 1 ? '.' + parts.pop() : '';
};

export const path = {
  resolve,
  join,
  basename,
  dirname,
  extname
};

export const fs = {
  readFileSync: () => new Uint8Array(0),
  writeFileSync: () => {},
  exists: () => false,
  mkdir: () => {}
};

export const stream = {
  Transform: class {}
};

// Default export if a module tries to import the whole object
export default {
  ...path,
  fs,
  stream
};