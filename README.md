# Folio – Modern PDF & Document Reader with Markdown Export & AI Integration

A high-performance, private, and feature-rich Web application for reading, editing, listening to, and converting documents. Built with **React 19**, **Vite**, **TypeScript**, **Hono**, and **Cloudflare Workers**.

---

## 🚀 Key Features

### 📄 Document & PDF Reader
- **Continuous & Single Page Views**: Smooth infinite vertical scrolling or focused single-page layout.
- **Web Article Reader**: Ingest and read web pages cleanly without clutter or distractions.
- **PWA & Native OS File Association**: Install as a Progressive Web App (PWA) to open PDFs directly from your file manager.

### 🎙️ Text-to-Speech (TTS) Engine
- **Synchronized Playback**: Word-level tracking and progress seeking across paragraphs.
- **Configurable Audio**: Speed (0.5× – 2.0×), pitch adjustment, and selection of local offline and cloud online neural voices.
- **Auto-Advance**: Continuous hands-free listening across pages.
- **Header & Footer Filtering**: Configurable margin detection to skip repetitive running headers and page numbers.

### ✍️ Fullscreen PDF Editor
- **Drawing Tools**: Smooth freehand pen and semi-transparent highlighter with customizable colors and stroke widths.
- **Text & Stamp Overlays**: Dynamic resizable text annotations and configurable watermark stamps (`CONFIDENTIAL`, `APPROVED`, etc.).
- **Signature Pad**: Draw custom signatures with touch or mouse input and place them seamlessly.
- **Page Management**: Rotate, reorder, duplicate, add blank pages, and delete pages.
- **Client-Side Export**: High-resolution vector and rasterized PDF rendering using `pdf-lib`.

---

## 📝 Markdown Export via `@firecrawl/anydoc-wasm`

Folio integrates **`@firecrawl/anydoc-wasm`**, a Rust-based WebAssembly compilation of [anydoc](https://github.com/firecrawl/anydoc), to convert documents into clean **GitHub-Flavored Markdown (GFM)** directly in the browser.

### Supported Input Formats
- **PDF Documents** (`.pdf`)
- **Word & Office Documents** (`.docx`, `.doc`, `.odt`, `.rtf`)
- **E-books** (`.epub`)
- **Spreadsheets & Data** (`.xlsx`, `.ods`, `.csv`)
- **Presentations** (`.pptx`, `.ppt`, `.odp`)
- **Web Pages & Online Articles**

### ✨ Markdown Export Features
- **Granular Page Selection**: Convert **All Pages**, the **Current Page**, or any **Custom Range** (e.g. `1-3, 5, 8-10`) via in-memory `pdf-lib` page extraction before WASM processing.
- **High-Fidelity GFM Preview**: Full rendering of markdown data tables, formatted headings, code blocks with syntax styling, blockquotes, and task lists via `marked`.
- **100% Client-Side & Private**: Documents never leave the user's browser—WebAssembly executes locally on device memory with zero server data transfer.
- **Structural Fidelity**: Preserves document hierarchy, nested headings, markdown data tables, bulleted lists, and code blocks.
- **Blazing Fast**: Native Rust performance compiled to WASM.

---

## 🤖 AI & LLM Integration Architecture

The Markdown export engine forms the foundational layer for upcoming AI-powered features in Folio.

```
┌─────────────────────────────────────────────────────────────┐
│                    Document (PDF/DOCX/Web)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          @firecrawl/anydoc-wasm (Client-Side WASM)          │
│        - Document Model Parsing & Layout Analysis           │
│        - GitHub-Flavored Markdown (GFM) Generation          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Folio Markdown & AI Bridge                  │
│        - Real-Time Token Estimator (~Tokens / Word Count)   │
│        - Structured Heading & Table Preserver               │
│        - Context-Window Chunker for RAG Pipelines           │
└──────────────────────────────┬──────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Executive     │      │ Grounded Q&A  │      │ Structured    │
│ Summary &     │      │ & Knowledge   │      │ JSON & Data   │
│ Key Takeaways │      │ Retrieval     │      │ Extraction    │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Future LLM Endpoints & Edge AI Integrations      │
│  - Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct)  │
│  - Google Gemini API (Gemini 2.0 / 3.0 Flash & Pro)         │
│  - OpenAI API (GPT-4o, o3-mini)                             │
│  - Anthropic API (Claude 3.7 Sonnet)                        │
└─────────────────────────────────────────────────────────────┘
```

### Why Markdown is Ideal for LLMs
- **Token Efficiency**: Strips away binary formatting bloat, saving up to 70% of LLM context window tokens compared to raw PDF stream extractions.
- **Preserved Semantics**: LLMs (GPT-4o, Claude 3.7, Gemini 2.0/3.0, DeepSeek) are pre-trained on millions of Markdown documents and intuitively understand table grids (`| col |`), headings (`#`, `##`), and bullet points.
- **RAG & Chunking Ready**: Clean line-based markdown allows semantic chunking without losing table headers or list contexts.

### Built-in AI Prompt Presets
The interactive **Export as Markdown** modal includes ready-to-use prompt wrappers:
- 📝 **Executive Summary**: Generates TL;DR, core findings, and key takeaways.
- ❓ **Q&A & Knowledge Base**: Formats the document as system context for accurate, hallucination-free question answering.
- 🔍 **Structured JSON Extraction**: Instructs the model to output parsed dates, entities, and financial tables into strict JSON schemas.
- ✅ **Action Items & Checklist**: Isolates actionable tasks, assigned owners, and milestones.

### Planned LLM Roadmap
- [ ] **Cloudflare Workers AI Edge Inference**: Serverless document summarization powered by `@cloudflare/ai` using Llama 3.3 and DeepSeek models.
- [ ] **Interactive Document Chat**: In-browser sidecar assistant to converse with the loaded document.
- [ ] **Local Embeddings & Semantic Search**: Vectorize document chunks using in-browser Transformers.js / ONNX or Cloudflare Vectorize.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Document Rendering**: PDF.js (`pdfjs-dist`), `pdf-lib`
- **Markdown & WASM**: `@firecrawl/anydoc-wasm`
- **Backend / Edge**: Hono on Cloudflare Workers
- **Audio**: Web Speech API (`SpeechSynthesis`) with background keep-alive audio oscillators

---

## 💻 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 20+ recommended)
- `npm`

### 2. Installation
```bash
git clone <repo-url>
cd pdf-reader
npm install
```

### 3. Development
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

### 5. Deploy to Cloudflare Workers
```bash
npm run deploy
```

---

## 📄 License
MIT
