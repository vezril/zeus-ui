/** Upload helpers: content-type detection and object-key composition. */

const EXT_CONTENT_TYPES: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

/**
 * The content type to send to Apollo. Prefers the browser's own detection
 * (File.type), falling back to an extension map, then a generic binary type.
 */
export function detectContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext && EXT_CONTENT_TYPES[ext]) || "application/octet-stream";
}

/** Compose an object key from the current prefix and a file name. */
export function composeKey(prefix: string, fileName: string): string {
  return `${prefix}${fileName}`;
}
