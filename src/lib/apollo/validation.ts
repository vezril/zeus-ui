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
