/**
 * Client-side mirrors of Apollo's `domain-model` validation, for instant form
 * feedback. Apollo still validates server-side and returns INVALID_ARGUMENT as
 * the backstop — these rules just avoid a round-trip for obviously bad input.
 */

/**
 * Bucket name (GCS-inspired): 3–63 chars, lowercase letters/digits/hyphens,
 * must start and end with a letter or digit. Returns an error message, or null
 * when valid.
 */
export function validateBucketName(name: string): string | null {
  if (name.length < 3 || name.length > 63) {
    return "Must be 3–63 characters.";
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return "Only lowercase letters, digits, and hyphens.";
  }
  if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) {
    return "Must start and end with a letter or digit.";
  }
  return null;
}

/**
 * Object key (`ObjectName`): 1–1024 **bytes** UTF-8 (measured as bytes, not
 * chars), no NUL, and no path traversal — reject a leading `/`, backslashes,
 * and `.`/`..` segments. Nested `/` prefixes (the "folders") are valid. Returns
 * an error message, or null when valid.
 */
export function validateObjectKey(key: string): string | null {
  if (key.length === 0) return "Key is required.";
  if (new TextEncoder().encode(key).length > 1024) {
    return "Key must be 1024 bytes or fewer.";
  }
  if (key.includes("\0")) return "Key must not contain a NUL character.";
  if (key.startsWith("/")) return "Key must not start with '/'.";
  if (key.includes("\\")) return "Key must not contain backslashes.";
  if (key.split("/").some((seg) => seg === "." || seg === "..")) {
    return "Key must not contain '.' or '..' path segments.";
  }
  return null;
}
