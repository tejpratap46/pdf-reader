export const splitParagraphs = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3)
    chunks.push(sentences.slice(i, i + 3).join("").trim());
  return chunks.filter(p => p.length > 10);
};

export const getParagraphStarts = (paras: string[]): number[] => {
  const s: number[] = [];
  let pos = 0;
  for (const p of paras) {
    s.push(pos);
    pos += p.length + 1;
  }
  return s;
};

export const snapToWord = (text: string, offset: number): number => {
  const i = text.lastIndexOf(" ", offset);
  return i > 0 ? i + 1 : 0;
};

/** Strip HTML tags and decode entities, extract main readable content */
export const extractTextFromHtml = (html: string): { title: string; paragraphs: string[] } => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Remove noise elements
  ["script", "style", "nav", "header", "footer", "aside", "noscript", "iframe", "form", "button", "select", "input", "svg", "img"].forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });
  const titleEl = doc.querySelector("title");
  const title = titleEl?.textContent?.trim() ?? "Web Page";
  // Try to find main content
  const main = doc.querySelector("main, article, [role='main'], .content, .post, .article, #content, #main")
    ?? doc.body;
  const rawText: string = (main?.textContent ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\t+/g, " ")
    .trim();
  // Split on double newlines to get natural paragraphs, then further split long ones
  const rawParas = rawText.split(/\n\n+/).map((p: string) => p.replace(/\s+/g, " ").trim()).filter((p: string) => p.length > 30);
  const result: string[] = [];
  for (const rp of rawParas) {
    const sentences = rp.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [rp];
    for (let i = 0; i < sentences.length; i += 3)
      result.push(sentences.slice(i, i + 3).join("").trim());
  }
  return { title, paragraphs: result.filter(p => p.length > 10) };
};

/**
 * Converts Markdown content into clear, natural speech text suitable for TTS speech engines.
 * Strips code blocks, links, headers, and markdown noise so the voice speaks naturally.
 */
export const markdownToSpeechText = (md: string): string => {
  if (!md) return "";
  return md
    // Remove multi-line code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Replace links with label
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove markdown headers #
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold and italics formatting
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove blockquotes >
    .replace(/^\s*>\s+/gm, "")
    // Clean markdown table syntax
    .replace(/\|/g, " ")
    .replace(/[-:]{3,}/g, " ")
    // Replace bullet points and list indicators with natural pauses
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Clean up excessive whitespace and newlines
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
