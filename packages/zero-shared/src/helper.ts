export function assert(b: unknown, msg: string | (() => string) = 'Assertion failed'): asserts b {
  if (!b) {
    throw new Error(typeof msg === 'string' ? msg : msg());
  }
}

export function must<T>(v: T | undefined | null, msg?: string): T {
  if (v == null) {
    throw new Error(msg ?? `Unexpected ${v} value`);
  }
  return v;
}
