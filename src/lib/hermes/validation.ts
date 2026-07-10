/**
 * Client-side mirror of HermesMQ's topic-id rules, for instant form feedback.
 * HermesMQ still validates server-side (400 as the backstop):
 *   - `TopicId.from`: non-blank (trimmed).
 *   - `TenantScope.validateExternalId`: must not contain the reserved tenant
 *     separator '~' (which would let an id escape its tenant namespace).
 */

/** The reserved tenant-namespace separator HermesMQ forbids in external ids. */
export const RESERVED_SEPARATOR = "~";

/**
 * Validate any HermesMQ external id (topic id, subscription id) against the
 * server rules: non-blank and not containing the reserved separator. `label`
 * names the field for the message. Returns an error message, or null when valid.
 */
export function validateHermesId(id: string, label = "Id"): string | null {
  if (id.trim().length === 0) {
    return `${label} must not be blank.`;
  }
  if (id.includes(RESERVED_SEPARATOR)) {
    return `${label} must not contain '${RESERVED_SEPARATOR}'.`;
  }
  return null;
}

/** Returns an error message, or null when the topic id is valid. */
export function validateTopicId(topicId: string): string | null {
  return validateHermesId(topicId, "Topic id");
}
