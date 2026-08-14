import { estimateTokenCount } from "tokenx";

/**
 * In-memory LRU-like token count cache for arbitrary string content
 */
const tokenCountCache = new Map<string, number>();
const MAX_CACHE_ENTRIES = 2000;

/**
 * In-memory page-by-page token cache: docKey -> Map<pageNum, tokenCount>
 */
const documentPageTokenCache = new Map<string, Map<number, number>>();

/**
 * In-memory all-pages (full document) token count cache: docKey -> tokenCount
 */
const documentAllPagesTokenCache = new Map<string, number>();

/**
 * Get token count for a string with in-memory caching
 */
export function getCachedTokenCount(text: string | null | undefined): number {
  if (!text) return 0;
  
  const cached = tokenCountCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const count = estimateTokenCount(text);

  if (tokenCountCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = tokenCountCache.keys().next().value;
    if (firstKey !== undefined) {
      tokenCountCache.delete(firstKey);
    }
  }

  tokenCountCache.set(text, count);
  return count;
}

/**
 * Explicitly set or update a cached token count for a specific string
 */
export function setCachedTokenCount(text: string, count: number): void {
  if (!text) return;
  tokenCountCache.set(text, count);
}

/**
 * Cache token count for a specific page of a document
 */
export function setPageTokenCount(docKey: string, pageNum: number, count: number): void {
  if (!docKey) return;
  let pageMap = documentPageTokenCache.get(docKey);
  if (!pageMap) {
    pageMap = new Map<number, number>();
    documentPageTokenCache.set(docKey, pageMap);
  }
  pageMap.set(pageNum, count);
}

/**
 * Get cached token count for a specific page of a document
 */
export function getPageTokenCount(docKey: string, pageNum: number): number | undefined {
  if (!docKey) return undefined;
  return documentPageTokenCache.get(docKey)?.get(pageNum);
}

/**
 * Get all cached page token counts for a document
 */
export function getAllPageTokenCounts(docKey: string): Map<number, number> | undefined {
  if (!docKey) return undefined;
  return documentPageTokenCache.get(docKey);
}

/**
 * Cache the total token count for all pages (full document)
 */
export function setAllPagesTokenCount(docKey: string, totalTokens: number): void {
  if (!docKey) return;
  documentAllPagesTokenCache.set(docKey, totalTokens);
}

/**
 * Get the cached total token count for all pages (full document)
 */
export function getAllPagesTokenCount(docKey: string): number | undefined {
  if (!docKey) return undefined;
  return documentAllPagesTokenCache.get(docKey);
}

/**
 * Clear token caches (optionally for a specific document, or everything)
 */
export function clearTokenCache(docKey?: string): void {
  if (docKey) {
    documentPageTokenCache.delete(docKey);
    documentAllPagesTokenCache.delete(docKey);
  } else {
    tokenCountCache.clear();
    documentPageTokenCache.clear();
    documentAllPagesTokenCache.clear();
  }
}
