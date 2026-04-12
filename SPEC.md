# Streaming Research Agent — Build Spec

## Overview

A single-page web app. The user types a research question. An autonomous agent searches the web, reads relevant pages, decides if it has enough information, and streams a synthesized answer with inline citations. The entire reasoning process is visible in the UI.

---

## File-by-File Specification

### `app/api/chat/route.ts` — API Route (POST)

The serverless function that handles each research query. This is the entry point for the Vercel AI SDK streaming protocol.

**What it does:**
1. Receives the user's message array from the frontend (via `useChat`)
2. Calls the agent loop in `lib/agent.ts` with the latest user message
3. Returns a streaming response using the Vercel AI SDK's `streamText` or a custom `ReadableStream` that pushes text chunks, tool calls, and tool results as they happen

**Key details:**
- Uses `export const runtime = 'edge'` or Node runtime depending on SDK compatibility
- Sets `maxDuration` for Vercel serverless timeout (30s on free tier, should be enough)
- Passes API keys from `process.env` — never from the client

---

### `lib/agent.ts` — The Agent Loop

The core of the project. A hand-rolled ReAct loop using the Anthropic SDK's `tool_use` feature. No frameworks.

**The loop, step by step:**

```
1. SYSTEM PROMPT
   Set the agent's role: "You are a research assistant. Answer the user's
   question by searching the web and reading sources. Always cite your
   sources with inline links. When you have enough information to give a
   thorough answer, stop searching and write your response."

2. INITIAL CALL
   Send the user's question + system prompt + tool definitions to Claude.
   Stream the response.

3. CHECK RESPONSE
   Claude responds with either:
   a) A text block → final answer. Stream it to the client. Done.
   b) A tool_use block → the agent wants to call a tool. Continue to step 4.

4. EXECUTE TOOL
   Parse the tool name and arguments from Claude's response.
   Call the corresponding function (search or read).
   Collect the tool result.

5. FEED BACK
   Append the tool_use message and tool_result to the message array.
   Send the updated array back to Claude. Stream the response.
   Go to step 3.

6. SAFETY VALVE
   Cap iterations at 10 tool calls per query. If the agent hasn't
   produced a final answer after 10 tool calls, force a synthesis
   by appending a user message: "You've done enough research.
   Synthesize your answer now from what you've found."
```

**What gets streamed to the client at each step:**
- Text tokens as they arrive (the final answer)
- Tool call events (what tool the agent is calling and why)
- Tool result summaries (what the search/read returned)
- These are sent as data stream annotations or custom stream parts so the frontend can render them distinctly

**Approximately 80–120 lines of TypeScript.** The simplicity is the point.

---

### `lib/tools.ts` — Tool Definitions

Defines the tools that Claude can call. Each tool has a name, description (what Claude reads to decide when to use it), and input schema.

**Two tools:**

#### `search`
- **Description:** "Search the web for information about a topic. Returns a list of relevant results with titles, URLs, and content snippets. Use this when you need to find information about the user's question."
- **Input schema:** `{ query: string }` — the search query
- **Calls:** `tavily.ts`

#### `read`
- **Description:** "Read the full content of a web page. Returns the page content as clean markdown text. Use this when you found a promising URL from search results and need to read the full article for detailed information."
- **Input schema:** `{ url: string }` — the URL to read
- **Calls:** `jina.ts`

---

### `lib/tavily.ts` — Tavily Search Client

A thin wrapper around the Tavily Search API.

**What it does:**
1. Takes a search query string
2. Calls `POST https://api.tavily.com/search` with `{ query, max_results: 5, include_raw_content: false }`
3. Returns an array of `{ title, url, content }` objects (the search snippets)

**Why Tavily:** Purpose-built for LLM agents. Returns pre-extracted content (not raw HTML). Free tier gives 1,000 searches/month — more than enough for a portfolio project.

---

### `lib/jina.ts` — Jina Reader Client

A thin wrapper around the Jina Reader API.

**What it does:**
1. Takes a URL string
2. Calls `GET https://r.jina.ai/{url}` with `Accept: application/json` header
3. Returns the page content as clean markdown (Jina strips navigation, ads, scripts)
4. Truncates to ~6,000 characters to stay within Claude's context budget per source

**Why Jina:** Converts any URL to LLM-friendly markdown with zero scraping infrastructure. Free tier works without an API key.

---

### `lib/types.ts` — Shared Types

TypeScript interfaces used across the project:

```typescript
// A source the agent found during research
interface Source {
  title: string
  url: string
  snippet: string      // brief content from search results
  content?: string     // full content if the agent read the page
}

// A step in the agent's reasoning process
interface ThinkingStep {
  type: 'search' | 'read' | 'reasoning'
  query?: string       // for search steps
  url?: string         // for read steps
  summary: string      // human-readable description of what happened
  sources?: Source[]   // sources found in this step
}

// The complete agent response
interface AgentResponse {
  answer: string            // the final synthesized answer with citations
  sources: Source[]         // all sources consulted
  steps: ThinkingStep[]    // the full reasoning trace
}
```

---

### `app/page.tsx` — Main Page

The single page of the app. Composes the chat components.

**Layout:**
- Clean, centered layout (max-width ~768px, like ChatGPT / Perplexity)
- Header: project name + brief tagline
- Main area: message list (question → thinking steps → answer)
- Bottom: search input bar, fixed to bottom

**Behavior:**
- On load: empty state with a few example questions as clickable chips
- After submission: the input disables, thinking steps appear as the agent works, then the answer streams in

---

### `components/chat.tsx` — Chat Container

The main chat component. Uses `useChat` from the Vercel AI SDK.

**What it does:**
1. Manages the message array via `useChat({ api: '/api/chat' })`
2. Renders each message using the `message.tsx` component
3. Handles loading state (shows thinking steps while agent is working)
4. Scrolls to bottom as new content streams in

---

### `components/message.tsx` — Message Bubble

Renders a single message — either the user's question or the agent's response.

**For user messages:** Simple text bubble, right-aligned.

**For agent messages:**
- Renders markdown (using `react-markdown` or similar)
- Inline citations rendered as superscript numbers that link to sources: "The population of Tokyo is approximately 14 million[¹](#source-1)"
- Clicking a citation scrolls to the sources panel or opens the URL

---

### `components/thinking-step.tsx` — Agent Reasoning Step

Shows what the agent is doing at each step of the loop. Collapsed by default after the answer is complete; expanded while the agent is actively working.

**Visual states:**
- **Active (in progress):** Animated indicator + "Searching for: climate change effects on coral reefs..."
- **Complete:** Checkmark + summary. Expandable to show details.

**Step types:**
- 🔍 **Search:** "Searched for: {query}" → shows result titles
- 📖 **Read:** "Reading: {page title}" → shows URL
- 💭 **Reasoning:** "Deciding whether more research is needed..."

---

### `components/sources-panel.tsx` — Sources Panel

A collapsible panel (or sidebar on desktop) showing all sources the agent consulted.

**Each source shows:**
- Favicon (via `https://www.google.com/s2/favicons?domain={domain}`)
- Page title (linked to URL)
- Brief snippet from the search result
- Badge if the agent read the full page (vs. just seeing it in search results)

---

### `components/search-input.tsx` — Query Input

A text input with a submit button, fixed to the bottom of the viewport.

**Behavior:**
- Placeholder: "Ask a research question..."
- Submit on Enter or click
- Disabled while the agent is working
- Example question chips shown in empty state (disappear after first query)

**Example questions (hardcoded):**
- "What are the leading theories on dark matter?"
- "How does mRNA vaccine technology work?"
- "What caused the 2008 financial crisis?"

---

### `app/layout.tsx` — Root Layout

Standard Next.js App Router layout. Sets:
- HTML metadata (title, description, OG image)
- Font (Inter or Geist from `next/font`)
- Body wrapper with dark/light mode support via Tailwind

---

### `app/globals.css` — Global Styles

Tailwind directives (`@tailwind base/components/utilities`) plus:
- Custom scrollbar styling
- Markdown prose styling for agent answers
- Animation for the thinking step indicator

---

## The Agent Loop — Visual Summary

```
User: "What are the health effects of microplastics?"
         │
         ▼
   ┌─────────────┐
   │  Claude API  │  System prompt + tools + user question
   └──────┬──────┘
          │
          ▼
   tool_use: search("health effects of microplastics 2025 research")
          │
          ▼
   ┌─────────────┐
   │   Tavily     │  → 5 results with titles, URLs, snippets
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Claude API  │  Here are the search results. What next?
   └──────┬──────┘
          │
          ▼
   tool_use: read("https://www.nature.com/articles/...")
          │
          ▼
   ┌─────────────┐
   │    Jina      │  → clean markdown of the article
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Claude API  │  Here's the article content. What next?
   └──────┬──────┘
          │
          ▼
   tool_use: read("https://www.who.int/...")
          │
          ▼
   ┌─────────────┐
   │    Jina      │  → clean markdown of WHO page
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Claude API  │  I have enough. Here's my answer:
   └──────┬──────┘
          │
          ▼
   Stream final answer with inline citations:

   "Recent research indicates that microplastics have been found
   in human blood, lungs, and placental tissue[¹]. A 2024 Nature
   study linked nanoplastic exposure to increased cardiovascular
   risk[²]. The WHO notes that while evidence is growing, long-term
   effects on human health remain under active investigation[³]..."

   Sources:
   [1] nature.com/articles/...
   [2] nature.com/articles/...
   [3] who.int/news-room/...
```

Typical queries complete in 3–6 tool calls (1–2 searches + 2–4 page reads).

---

## UI Wireframe (Text)

```
┌──────────────────────────────────────────────┐
│  🔬 Research Agent                           │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ What are the health effects of         │  │
│  │ microplastics?                    [You] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ▼ Research Steps (4 steps)             │  │
│  │   ✓ Searched: "microplastics health"   │  │
│  │   ✓ Read: Nature — Nanoplastics in...  │  │
│  │   ✓ Read: WHO — Microplastics and...   │  │
│  │   ✓ Searched: "microplastics blood..."  │  │
│  │                                        │  │
│  │ Recent research indicates that         │  │
│  │ microplastics have been found in       │  │
│  │ human blood, lungs, and placental      │  │
│  │ tissue¹. A 2024 Nature study linked... │  │
│  │                                        │  │
│  │ Sources                                │  │
│  │ ┌──────────────────────────────────┐   │  │
│  │ │ 🌐 Nature — Nanoplastics in...  │   │  │
│  │ │ 🌐 WHO — Microplastics and...   │   │  │
│  │ │ 🌐 NIH — Blood microplastic...  │   │  │
│  │ └──────────────────────────────────┘   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Ask a research question...        [→]  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## What "Done" Looks Like (Portfolio Demo)

### Must-Have (MVP)

1. **Live URL on Vercel** that anyone can visit
2. **Ask a question, get a streamed answer** with real web sources
3. **Inline citations** — superscript numbers linking to actual URLs
4. **Visible agent reasoning** — expandable thinking steps showing search queries and pages read
5. **Sources list** — all consulted sources with titles and links
6. **Responsive** — works on mobile
7. **Clean README** — what it is, screenshot/gif, live demo link, "how it works" section explaining the agent loop
8. **Hand-rolled agent loop** visible in `lib/agent.ts` — no framework dependencies

### Nice-to-Have (Post-MVP)

9. **Follow-up questions** — ask another question that builds on the previous answer's context
10. **Dark mode** toggle
11. **Loading skeleton** — shimmer placeholders while agent is working
12. **Error handling UI** — graceful message if the API fails or rate-limits hit
13. **Open Graph preview** — custom OG image so the link looks good when shared on LinkedIn/Twitter

### Explicitly Out of Scope

- User authentication
- Conversation history / persistence
- Database
- Multiple concurrent research threads
- Admin dashboard
- Rate limiting (rely on API key limits)
- Tests (MVP is a portfolio demo, not a production service)

---

## Dependency List

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "ai": "latest",
    "@anthropic-ai/sdk": "latest",
    "react-markdown": "latest",
    "remark-gfm": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "latest",
    "postcss": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest"
  }
}
```

No LangChain. No LangGraph. No agent framework. The Anthropic SDK + two API clients + React + Tailwind. That's the whole stack.

---

## System Prompt (Draft)

```
You are a research assistant. Your job is to answer the user's question
thoroughly and accurately by searching the web and reading relevant sources.

Instructions:
- Start by searching for the user's question. Use specific, targeted search queries.
- Read the most promising results to get detailed information.
- If your first search doesn't give enough information, search again with different terms.
- When you have enough information to write a thorough answer, stop searching.
- Write your answer in clear, well-structured markdown.
- ALWAYS cite your sources using inline numbered references like [1], [2], etc.
- At the end of your answer, list all sources with their numbers and URLs.
- Be thorough but concise. Aim for 200-400 words unless the topic requires more.
- If you cannot find reliable information, say so honestly.
```

---

## Build Order

Recommended implementation sequence:

1. **Scaffold** — `pnpm create next-app`, Tailwind, TypeScript config
2. **API clients** — `tavily.ts` and `jina.ts` (test with hardcoded queries)
3. **Tool definitions** — `tools.ts` (the schemas Claude will read)
4. **Agent loop** — `agent.ts` (the core — test via CLI/curl before building UI)
5. **API route** — `route.ts` (wire agent to Vercel AI SDK streaming)
6. **Chat UI** — `chat.tsx`, `message.tsx`, `search-input.tsx` (basic streaming works)
7. **Thinking steps** — `thinking-step.tsx` (make reasoning visible)
8. **Sources panel** — `sources-panel.tsx` (show all consulted sources)
9. **Citations** — Parse `[1]` references in markdown, link to sources
10. **Polish** — responsive, empty state, example questions, OG image
11. **Deploy** — push to GitHub, connect to Vercel, verify live URL
12. **README** — screenshot/gif, live link, architecture explanation
