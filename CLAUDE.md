# Streaming Research Agent

## What This Is

A streaming multi-agent research assistant. The user asks a question; an autonomous agent loops through search → read → decide → synthesize and streams the answer back with inline citations. Like Perplexity, but built from scratch with the agent loop fully visible.

## Why I'm Building It

This is the portfolio project that bridges every gap in my current work:

- **python-rag-agent** retrieves from a static corpus. This agent decides *what* to fetch and *when to stop* — the harder problem.
- **conversational-calculator-agent** used LangChain to abstract away the ReAct loop. This project writes the loop by hand (~100 lines of TypeScript) to prove I understand the pattern, not just the framework.
- **mars-today** is my only deployed project but has no AI. This ships to Vercel with a real URL — a live AI product I can demo in interviews.
- None of my current projects have a streaming UI. The `useChat` + Vercel AI SDK pattern is now the industry standard for AI products.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15 (App Router), TypeScript | Fills the React/TypeScript gap in my portfolio. App Router is current standard. |
| Streaming | Vercel AI SDK (`ai` package, `useChat`) | Industry-standard streaming chat pattern. Handles SSE, tool call rendering, message state. |
| Agent LLM | Anthropic Claude via `@anthropic-ai/sdk` | Shows range beyond OpenAI (used in RAG agent). Claude's tool_use API is clean for hand-rolled loops. |
| Search tool | Tavily Search API | Purpose-built for LLM agents. Returns pre-extracted content. Generous free tier (1,000 calls/month). |
| Read tool | Jina Reader API (`r.jina.ai`) | Converts any URL to clean markdown. Free tier. No scraping infrastructure needed. |
| Styling | Tailwind CSS | Fast, utility-first. No component library overhead. |
| State | In-memory (message array) | No database needed. Agent state lives in the conversation. Keeps scope tight. |
| Deploy | Vercel (free tier) | Zero-config for Next.js. Serverless functions for the API route. Production URL for demos. |
| Package manager | pnpm | Fast, disk-efficient. Standard for Next.js projects in 2026. |

### Why NOT these alternatives

- **LangChain / LangGraph / Mastra**: Writing the ReAct loop by hand is ~100 lines and far more impressive to interviewers than importing a framework. The wiki documents the tutorial-to-production gap — this project sits on the production side.
- **Python backend**: I already have four Python AI projects. TypeScript full-stack fills a real gap and keeps the entire app in one language.
- **Database**: Adding Postgres/Supabase would be scope creep. The research agent is stateless by design — each query is independent.
- **Streamlit**: Already used in two projects (RAG agent, stock predictor). A React streaming UI is the skill that matters for AI product roles.

## Patterns to Avoid (From Past Work)

1. **No local-only projects.** Stock predictor and RAG agent never got deployed. This ships to Vercel from day one.
2. **No dual frontends.** RAG agent had both Streamlit and Next.js, diluting both. Pick one (Next.js) and do it well.
3. **No framework abstraction hiding the logic.** Calculator agent used LangChain — the agent loop was invisible. Write it by hand so the code *is* the portfolio piece.
4. **No feature creep.** mars-today's collections/comments/auth were appropriate for that project. This one stays focused: ask → research → stream answer. No auth, no history, no saved searches.
5. **No untyped code.** TypeScript strict mode throughout. Pydantic taught me typed agents in Python; carry that discipline to TS.

## File Structure

```
streaming-research-agent/
├── CLAUDE.md                  # This file — project context
├── SPEC.md                    # Build specification
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local                 # ANTHROPIC_API_KEY, TAVILY_API_KEY (gitignored)
├── .env.example               # Template with placeholder keys
├── .gitignore
├── app/
│   ├── layout.tsx             # Root layout, fonts, metadata
│   ├── page.tsx               # Main page — chat UI
│   ├── globals.css            # Tailwind base + custom styles
│   └── api/
│       └── chat/
│           └── route.ts       # POST handler — the agent loop + streaming
├── lib/
│   ├── agent.ts               # Hand-rolled ReAct loop: reason → tool call → observe → repeat
│   ├── tools.ts               # Tool definitions: search, read
│   ├── tavily.ts              # Tavily Search API client
│   ├── jina.ts                # Jina Reader API client
│   └── types.ts               # Shared TypeScript types
├── components/
│   ├── chat.tsx               # Chat container — uses useChat from Vercel AI SDK
│   ├── message.tsx            # Single message bubble with citation rendering
│   ├── sources-panel.tsx      # Side panel showing sources the agent found
│   ├── thinking-step.tsx      # Expandable agent reasoning step
│   └── search-input.tsx       # Query input bar
└── public/
    └── og-image.png           # Open Graph image for link previews
```

## Definition of Done

A staff engineer reviewing this for a portfolio would see:

- [ ] Live Vercel URL that loads in under 2 seconds
- [ ] User types a question, answer streams back in real-time with visible thinking steps
- [ ] Inline citations link to actual sources; clicking opens the source
- [ ] Agent reasoning is expandable — you can watch the search → read → decide loop
- [ ] Sources panel shows all URLs the agent consulted
- [ ] The hand-rolled agent loop in `lib/agent.ts` is clean, readable, and under 150 lines
- [ ] No LangChain, no LangGraph, no agent framework — just the Anthropic SDK + tool definitions
- [ ] Works on mobile (responsive)
- [ ] README explains what it is, shows a screenshot/gif, and links to the live demo
- [ ] Clean git history with meaningful commits

## Brain Wiki Reference

Wiki path: `/Users/lukehurt/Documents/obsidian/brain/`

Relevant pages for this project:
- `wiki/analyses/project-ideas.md` — original idea and stack reasoning
- `wiki/concepts/react-agent.md` — the ReAct pattern this implements
- `wiki/sources/python-rag-agent.md` — predecessor project (static RAG)
- `wiki/sources/conversational-calculator-agent.md` — first agent project (LangChain)
- `wiki/entities/luke-hurt.md` — author context
- `wiki/tools/mastra.md` — TS agent framework considered and rejected
- `wiki/tools/pydantic-ai.md` — Python agent framework considered and rejected
- `wiki/tools/langgraph.md` — graph orchestration considered and rejected

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Local dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
```

## Environment Variables

```
ANTHROPIC_API_KEY=    # Required — Claude API key
TAVILY_API_KEY=       # Required — Tavily search API key
JINA_API_KEY=         # Optional — Jina Reader (free tier works without key, key raises rate limits)
```
