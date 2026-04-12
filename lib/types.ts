export interface Source {
  title: string
  url: string
  snippet: string
  content?: string
}

export interface ThinkingStep {
  type: 'search' | 'read' | 'reasoning'
  query?: string
  url?: string
  summary: string
  sources?: Source[]
}

export interface AgentResponse {
  answer: string
  sources: Source[]
  steps: ThinkingStep[]
}
