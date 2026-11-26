/*
  PDFs sometimes contain null characters or broken Unicode pairs.
  Postgres cannot store either and rejects the whole save with
  "unsupported Unicode escape sequence", so remove them up front.
*/
const UNSTORABLE_CHARS =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export const stripUnstorableChars = (text: string): string =>
  text.replace(UNSTORABLE_CHARS, "");
