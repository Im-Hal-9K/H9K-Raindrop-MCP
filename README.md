# H9K Raindrop MCP

A powerful Model Context Protocol (MCP) server for interacting with Raindrop.io bookmarks. This server exposes 14 comprehensive tools for managing your bookmarks, collections, and tags through the Raindrop.io API.

## Features

### Bookmark Management
- **search_bookmarks** - Search and filter bookmarks by keyword, tag, collection
- **get_bookmark** - Get details of a specific bookmark
- **create_bookmark** - Add new bookmarks with metadata
- **update_bookmark** - Modify existing bookmarks
- **delete_bookmark** - Remove bookmarks

### Collection Management
- **list_collections** - View all your collections/folders
- **get_collection** - Get details of a specific collection
- **create_collection** - Create new collections
- **update_collection** - Modify collection properties
- **delete_collection** - Remove collections

### Tag Management
- **list_tags** - View all tags with counts
- **rename_tag** - Rename tags across all bookmarks
- **delete_tag** - Remove tags from all bookmarks

### User Info
- **get_user_info** - Get your account information

## Installation

1. Clone this repository:
```bash
git clone https://github.com/YOUR_USERNAME/H9K-Raindrop-MCP.git
cd H9K-Raindrop-MCP
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Getting Your API Token

1. Go to [Raindrop.io App Settings](https://app.raindrop.io/settings/integrations)
2. Click on "Create new app" or use an existing app
3. Click "Create test token"
4. Copy the token for use below

## Configuration

### Using with Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "h9k-raindrop": {
      "command": "node",
      "args": ["C:\\Users\\YOUR_USERNAME\\H9K-Raindrop-MCP\\build\\index.js"],
      "env": {
        "RAINDROP_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

Replace `C:\\Users\\YOUR_USERNAME\\H9K-Raindrop-MCP\\build\\index.js` with the absolute path to your built index.js file, and replace `your-api-token-here` with your actual Raindrop.io API token.

### Using with Other MCP Clients

Set the `RAINDROP_API_TOKEN` environment variable and run:

```bash
node build/index.js
```

## Example Usage

Once connected to an MCP client (like Claude Desktop), you can:

**Search bookmarks:**
```
Search for bookmarks about "machine learning"
```

**Create a bookmark:**
```
Create a bookmark for https://example.com with title "Example Site" and tags ["reference", "useful"]
```

**Organize collections:**
```
Create a new collection called "Research Papers" and make it public
```

**Manage tags:**
```
Rename the tag "ml" to "machine-learning" across all my bookmarks
```

**Get bookmark details:**
```
Show me details for bookmark ID 12345
```

## Development

### Project Structure
```
H9K-Raindrop-MCP/
├── src/
│   ├── index.ts           # Main MCP server
│   ├── raindrop-client.ts # Raindrop.io API client
│   └── types.ts           # TypeScript types
├── build/                 # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

### Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development

## API Reference

### Bookmark Tools

#### search_bookmarks
Search and filter bookmarks with various criteria.

Parameters:
- `search` (optional): Search query string
- `collectionId` (optional): Filter by collection (0 = all, -1 = unsorted)
- `tag` (optional): Array of tags to filter by
- `sort` (optional): Sort order (-created, created, title, etc.)
- `page` (optional): Page number for pagination
- `perpage` (optional): Results per page (max 50)

#### create_bookmark
Create a new bookmark.

Parameters:
- `link` (required): URL to bookmark
- `title` (optional): Custom title
- `excerpt` (optional): Description
- `note` (optional): Personal notes
- `tags` (optional): Array of tags
- `collectionId` (optional): Collection to add to
- `important` (optional): Mark as favorite

#### update_bookmark
Update an existing bookmark.

Parameters:
- `id` (required): Bookmark ID
- Plus any fields from create_bookmark you want to change

### Collection Tools

#### create_collection
Create a new collection.

Parameters:
- `title` (required): Collection name
- `description` (optional): Description
- `public` (optional): Make public
- `view` (optional): View type (list, simple, grid, masonry)
- `parent` (optional): Parent collection ID for nesting

### Tag Tools

#### rename_tag
Rename a tag across all bookmarks.

Parameters:
- `oldName` (required): Current tag name
- `newName` (required): New tag name

## Troubleshooting

### Server won't start
- Verify your API token is correct
- Check that Node.js version is 18 or higher
- Ensure the build directory exists (run `npm run build`)

### API errors
- Check your API token has not expired
- Verify you're not hitting rate limits (120 requests/minute)
- Ensure bookmark/collection IDs are valid

## License

MIT

## Links

- [Raindrop.io API Documentation](https://developer.raindrop.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
