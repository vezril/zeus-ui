/**
 * Client-side mirror of HermesMQ's topic-id rules, for instant form feedback.
 * HermesMQ still validates server-side (400 as the backstop):
 *   - `TopicId.from`: non-blank (trimmed).
 *   - `TenantScope.validateExternalId`: must not contain the reserved tenant
 *     separator '~' (which would let an id escape its tenant namespace).
 */

/** The reserved tenant-namespace separator HermesMQ forbids in external ids. */
export const RESERVED_SEPARATOR = "~";

/** Returns an error message, or null when the topic id is valid. */
export function validateTopicId(topicId: string): string | null {
  if (topicId.trim().length === 0) {
    return "Topic id must not be blank.";
  }
  if (topicId.includes(RESERVED_SEPARATOR)) {
    return `Topic id must not contain '${RESERVED_SEPARATOR}'.`;
  }
  return null;
}
