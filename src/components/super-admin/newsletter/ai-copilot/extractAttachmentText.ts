import mammoth from "mammoth";

export type AttachmentKind = "pdf" | "docx" | "txt" | "md";

export interface ExtractedAttachment {
  kind: AttachmentKind;
  name: string;
  storage_path: string;
  extracted_text: string;
}

export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.docx,.txt,.md";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_EXTRACTED_TEXT_PER_FILE = 200_000; // chars
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export function inferKindFromFile(file: File): AttachmentKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "docx";
  if (name.endsWith(".md") || file.type === "text/markdown") return "md";
  if (name.endsWith(".txt") || file.type === "text/plain") return "txt";
  return null;
}

export async function extractText(file: File, kind: AttachmentKind): Promise<string> {
  if (kind === "txt" || kind === "md") {
    return await file.text();
  }
  if (kind === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  if (kind === "pdf") {
    return await extractPdfText(file);
  }
  throw new Error(`unsupported_kind: ${kind}`);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) =>
        item && typeof item === "object" && "str" in item
          ? String((item as { str: unknown }).str)
          : "",
      )
      .join(" ");
    pageTexts.push(text);
  }
  return pageTexts.join("\n\n");
}

export function stripHtmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
