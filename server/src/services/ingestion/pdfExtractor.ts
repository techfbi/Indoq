import { PDFParse } from "pdf-parse";

/*
  Opens a PDF, runs one operation, and always releases it.
  pdf-parse v2 exports a PDFParse class, not a callable function.
  The buffer is copied because the parser may take ownership of the
  memory it is given, and each PDF is opened twice during ingestion.
*/
const withPdf = async <T>(
  buffer: Buffer,
  operation: (parser: PDFParse) => Promise<T>
): Promise<T> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    return await operation(parser);
  } finally {
    await parser.destroy();
  }
};

// Reads the page count from metadata without extracting any text
export const getPdfPageCount = (buffer: Buffer): Promise<number> =>
  withPdf(buffer, async (parser) => (await parser.getInfo()).total);

/*
  Extracts the full text. pageJoiner is blank because the default
  adds page markers to the text, which would end up in the chunks.
*/
export const extractPdfText = (
  buffer: Buffer
): Promise<{ text: string; pageCount: number }> =>
  withPdf(buffer, async (parser) => {
    const result = await parser.getText({ pageJoiner: "" });
    return { text: result.text, pageCount: result.total };
  });
