#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RaindropClient } from './raindrop-client.js';

const API_TOKEN = process.env.RAINDROP_API_TOKEN;

if (!API_TOKEN) {
  console.error('Error: RAINDROP_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = new RaindropClient({ apiToken: API_TOKEN });

// Track server state for graceful shutdown
let isShuttingDown = false;

// Define all the tools
const tools: Tool[] = [
  {
    name: 'search_bookmarks',
    description: 'Search and list bookmarks (raindrops) with optional filters. Can search by keyword, tag, collection, or list all bookmarks.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search query to filter bookmarks'
        },
        collectionId: {
          type: 'number',
          description: 'Collection ID to search within (0 for all bookmarks, -1 for unsorted)'
        },
        tag: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        sort: {
          type: 'string',
          description: 'Sort order: -created (newest), created (oldest), -sort (manually), title, -title, domain, -domain',
          enum: ['-created', 'created', '-sort', 'title', '-title', 'domain', '-domain']
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (0-indexed)'
        },
        perpage: {
          type: 'number',
          description: 'Number of results per page (max 50)'
        }
      }
    }
  },
  {
    name: 'get_bookmark',
    description: 'Get details of a specific bookmark by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The bookmark ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'create_bookmark',
    description: 'Create a new bookmark (raindrop). Requires at minimum a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        link: {
          type: 'string',
          description: 'URL of the bookmark (required)'
        },
        title: {
          type: 'string',
          description: 'Custom title for the bookmark'
        },
        excerpt: {
          type: 'string',
          description: 'Short description/excerpt'
        },
        note: {
          type: 'string',
          description: 'Personal note about the bookmark'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to organize the bookmark'
        },
        collectionId: {
          type: 'number',
          description: 'Collection ID to add bookmark to (0 for unsorted, -1 for trash)'
        },
        important: {
          type: 'boolean',
          description: 'Mark as favorite/important'
        }
      },
      required: ['link']
    }
  },
  {
    name: 'update_bookmark',
    description: 'Update an existing bookmark. Only provide fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The bookmark ID to update'
        },
        title: {
          type: 'string',
          description: 'New title'
        },
        excerpt: {
          type: 'string',
          description: 'New excerpt/description'
        },
        note: {
          type: 'string',
          description: 'New note'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags (replaces existing tags)'
        },
        collectionId: {
          type: 'number',
          description: 'Move to different collection'
        },
        important: {
          type: 'boolean',
          description: 'Update favorite status'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_bookmark',
    description: 'Delete a bookmark permanently',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The bookmark ID to delete'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'list_collections',
    description: 'List all collections (folders) in your Raindrop.io account',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_collection',
    description: 'Get details of a specific collection by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The collection ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'create_collection',
    description: 'Create a new collection (folder) to organize bookmarks',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Collection title (required)'
        },
        description: {
          type: 'string',
          description: 'Collection description'
        },
        public: {
          type: 'boolean',
          description: 'Make collection public'
        },
        view: {
          type: 'string',
          description: 'View type: list, simple, grid, masonry',
          enum: ['list', 'simple', 'grid', 'masonry']
        },
        parent: {
          type: 'number',
          description: 'Parent collection ID for nesting'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'update_collection',
    description: 'Update an existing collection. Only provide fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The collection ID to update'
        },
        title: {
          type: 'string',
          description: 'New title'
        },
        description: {
          type: 'string',
          description: 'New description'
        },
        public: {
          type: 'boolean',
          description: 'Update public status'
        },
        view: {
          type: 'string',
          description: 'View type: list, simple, grid, masonry',
          enum: ['list', 'simple', 'grid', 'masonry']
        },
        parent: {
          type: 'number',
          description: 'Move to different parent collection'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_collection',
    description: 'Delete a collection permanently. Bookmarks inside will be moved to Unsorted.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The collection ID to delete'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'list_tags',
    description: 'List all tags used in your bookmarks with their counts',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'rename_tag',
    description: 'Rename a tag across all bookmarks',
    inputSchema: {
      type: 'object',
      properties: {
        oldName: {
          type: 'string',
          description: 'Current tag name'
        },
        newName: {
          type: 'string',
          description: 'New tag name'
        }
      },
      required: ['oldName', 'newName']
    }
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag from all bookmarks',
    inputSchema: {
      type: 'object',
      properties: {
        tagName: {
          type: 'string',
          description: 'Tag name to delete'
        }
      },
      required: ['tagName']
    }
  },
  {
    name: 'get_user_info',
    description: 'Get current user account information',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'h9k-raindrop-mcp',
    version: '1.0.2',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (isShuttingDown) {
    throw new Error('Server is shutting down. Please wait and try again.');
  }
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (isShuttingDown) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Server is shutting down. Please wait and try again. DO NOT RETRY immediately.'
        }
      ],
      isError: true
    };
  }

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_bookmarks': {
        const params = args as {
          search?: string;
          collectionId?: number;
          tag?: string[];
          sort?: string;
          page?: number;
          perpage?: number;
        };
        const result = await client.searchRaindrops(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_bookmark': {
        const { id } = args as { id: number };
        const result = await client.getRaindrop(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'create_bookmark': {
        const params = args as {
          link: string;
          title?: string;
          excerpt?: string;
          note?: string;
          tags?: string[];
          collectionId?: number;
          important?: boolean;
        };
        const result = await client.createRaindrop(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'update_bookmark': {
        const { id, ...updateParams } = args as {
          id: number;
          title?: string;
          excerpt?: string;
          note?: string;
          tags?: string[];
          collectionId?: number;
          important?: boolean;
        };
        const result = await client.updateRaindrop(id, updateParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'delete_bookmark': {
        const { id } = args as { id: number };
        await client.deleteRaindrop(id);
        return {
          content: [
            {
              type: 'text',
              text: `Bookmark ${id} deleted successfully`
            }
          ]
        };
      }

      case 'list_collections': {
        const result = await client.getCollections();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_collection': {
        const { id } = args as { id: number };
        const result = await client.getCollection(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'create_collection': {
        const params = args as {
          title: string;
          description?: string;
          public?: boolean;
          view?: string;
          parent?: number;
        };
        const result = await client.createCollection(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'update_collection': {
        const { id, ...updateParams } = args as {
          id: number;
          title?: string;
          description?: string;
          public?: boolean;
          view?: string;
          parent?: number;
        };
        const result = await client.updateCollection(id, updateParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'delete_collection': {
        const { id } = args as { id: number };
        await client.deleteCollection(id);
        return {
          content: [
            {
              type: 'text',
              text: `Collection ${id} deleted successfully`
            }
          ]
        };
      }

      case 'list_tags': {
        const result = await client.getTags();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'rename_tag': {
        const { oldName, newName } = args as { oldName: string; newName: string };
        await client.renameTag(oldName, newName);
        return {
          content: [
            {
              type: 'text',
              text: `Tag renamed from "${oldName}" to "${newName}" successfully`
            }
          ]
        };
      }

      case 'delete_tag': {
        const { tagName } = args as { tagName: string };
        await client.deleteTag(tagName);
        return {
          content: [
            {
              type: 'text',
              text: `Tag "${tagName}" deleted successfully`
            }
          ]
        };
      }

      case 'get_user_info': {
        const result = await client.getUser();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}. Available tools: ${tools.map(t => t.name).join(', ')}. DO NOT RETRY with the same tool name.`
            }
          ],
          isError: true
        };
    }
  } catch (error: any) {
    // Error is already formatted by the client with DO NOT RETRY messages
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Graceful shutdown handling
async function shutdown(signal: string) {
  console.error(`Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;

  // Give pending requests time to complete
  setTimeout(() => {
    console.error('Shutdown complete');
    process.exit(0);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle EPIPE errors on stdout/stderr - this happens when the client disconnects
// while we're trying to write a response
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') {
    // Client disconnected - exit gracefully
    process.exit(0);
  }
  console.error('stdout error:', error);
});

process.stderr.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') {
    // Client disconnected - exit gracefully
    process.exit(0);
  }
  // Can't log to stderr if stderr has an error, just exit
  process.exit(1);
});

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
  // EPIPE means client disconnected - exit gracefully
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
  console.error('Uncaught exception:', error);
  // Don't exit - try to keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit - try to keep the server running
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('H9K Raindrop MCP Server v1.0.2 running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
