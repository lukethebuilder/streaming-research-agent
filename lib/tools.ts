import type Anthropic from '@anthropic-ai/sdk/resources'

export const tools: Anthropic.Tool[] = [
  {
    name: 'search',
    description:
      'Search the web for information about a topic. Returns a list of relevant results with titles, URLs, and content snippets. Use this when you need to find information about the user\'s question.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read',
    description:
      'Read the full content of a web page. Returns the page content as clean markdown text. Use this when you found a promising URL from search results and need to read the full article for detailed information.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to read',
        },
      },
      required: ['url'],
    },
  },
]
