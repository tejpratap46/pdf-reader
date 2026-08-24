import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/", (c) => c.json({ name: "Cloudflare PDF Reader API" }));

/**
 * Helper to fetch HTML from a target URL with robust headers, timeouts, and error handling.
 */
const handleFetchHtml = async (targetUrl: string | undefined | null) => {
  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
    return {
      status: 400 as const,
      body: { error: "URL parameter is required" },
    };
  }

  let parsedUrl: URL;
  try {
    let normalized = targetUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }
    parsedUrl = new URL(normalized);
  } catch {
    return {
      status: 400 as const,
      body: { error: "Invalid URL format" },
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      status: 400 as const,
      body: { error: "Only http and https protocols are supported" },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: response.status >= 400 && response.status < 600 ? (response.status as 400 | 403 | 404 | 500 | 502) : 502,
        body: {
          error: `Target server returned HTTP ${response.status} (${response.statusText || "Error"})`,
          status: response.status,
        },
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    return {
      status: 200 as const,
      body: {
        ok: true,
        html,
        contents: html, // For compatibility
        url: response.url || parsedUrl.toString(),
        contentType,
        status: response.status,
      },
    };
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.name === "AbortError") {
      return {
        status: 504 as const,
        body: { error: "Request timed out while fetching the webpage (15s limit)" },
      };
    }
    return {
      status: 502 as const,
      body: {
        error: `Failed to fetch webpage: ${error?.message || "Network error"}`,
      },
    };
  }
};

// GET /api/fetch-html?url=https://example.com
app.get("/api/fetch-html", async (c) => {
  const url = c.req.query("url");
  const result = await handleFetchHtml(url);
  return c.json(result.body, result.status);
});

// POST /api/fetch-html with JSON body { "url": "https://example.com" }
app.post("/api/fetch-html", async (c) => {
  let url: string | undefined;
  try {
    const body = await c.req.json();
    url = body?.url;
  } catch {
    url = c.req.query("url");
  }
  const result = await handleFetchHtml(url);
  return c.json(result.body, result.status);
});

// Fallback / alias endpoints
app.get("/api/proxy", async (c) => {
  const url = c.req.query("url");
  const result = await handleFetchHtml(url);
  return c.json(result.body, result.status);
});

app.get("/api/fetch", async (c) => {
  const url = c.req.query("url");
  const result = await handleFetchHtml(url);
  return c.json(result.body, result.status);
});

export default app;
