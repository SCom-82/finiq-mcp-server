# FinIQ MCP Server

MCP server for [FinIQ](https://www.finiq.money) financial management API — auto-generates [Claude](https://claude.ai) tools from OpenAPI/Swagger.

Built on [Model Context Protocol](https://modelcontextprotocol.io) (MCP), this server exposes FinIQ API endpoints as tools that AI assistants can call directly. Point it at any FinIQ instance and get 200+ ready-to-use tools for financial operations.

## Features

- **Full financial accounting** — chart of accounts, journal entries, transaction documents, posting/unposting
- **Reference data** — counterparties, contracts, projects, employees, departments, organizations
- **Treasury** — bank accounts, cash accounts, funds, bank statement import
- **Sales** — meetings, offers (commercial proposals), sales contracts, document generation
- **Calculators** — calculators with BOM (bill of materials), price lists, discounts
- **Reports** — P&L, general ledger, account cards, fund balances, cash flow, project reports
- **3 tool modes** — `all` (every endpoint), `grouped` (selected services), `dynamic` (meta-tools)
- **Docker-ready** — multi-stage build, non-root execution
- **Swagger caching** — works offline after first fetch

## Quick Start

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINIQ_BASE_URL` | Yes | FinIQ server URL |
| `FINIQ_API_KEY` | Yes | API authentication key |
| `FINIQ_TOOL_MODE` | No | `all` (default), `grouped`, or `dynamic` |
| `FINIQ_ENABLED_GROUPS` | No | Comma-separated service groups (for `grouped` mode) |
| `FINIQ_SWAGGER_PATH` | No | OpenAPI spec path (default: `/swagger/v1/swagger.json`) |
| `FINIQ_LOCAL_SWAGGER` | No | Path to local swagger.json file |

### Claude Code (npx)

```json
// .mcp.json
{
  "mcpServers": {
    "finiq": {
      "command": "npx",
      "args": ["-y", "@finiq/mcp-server"],
      "env": {
        "FINIQ_BASE_URL": "https://your-finiq-instance.com",
        "FINIQ_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code (Docker)

```json
// .mcp.json
{
  "mcpServers": {
    "finiq": {
      "command": "docker",
      "args": ["run", "-i", "--rm",
        "-e", "FINIQ_BASE_URL",
        "-e", "FINIQ_API_KEY",
        "finiq/mcp-server:latest"
      ],
      "env": {
        "FINIQ_BASE_URL": "https://your-finiq-instance.com",
        "FINIQ_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "finiq": {
      "command": "npx",
      "args": ["-y", "@finiq/mcp-server"],
      "env": {
        "FINIQ_BASE_URL": "https://your-finiq-instance.com",
        "FINIQ_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / Other MCP Clients

Use the same `.mcp.json` format as Claude Code — most MCP-compatible editors support it.

### CLI Arguments

Environment variables can also be passed as CLI arguments:

```bash
finiq-mcp --base-url https://your-finiq-instance.com --api-key ABC123 --tool-mode grouped --enabled-groups warehouse,project
```

## Tool Modes

### `all` (default)

Every API endpoint becomes a separate MCP tool (~200+ tools). Best for full access when your client handles large tool lists well.

### `grouped`

Only tools from selected service groups are exposed. Set `FINIQ_ENABLED_GROUPS` to a comma-separated list:

```bash
FINIQ_ENABLED_GROUPS=warehouse,project,counterparty,transactionDocument
```

### `dynamic`

Exposes just 3 meta-tools for on-demand discovery:

| Tool | Description |
|------|-------------|
| `listServices` | List available API services and their endpoints |
| `getEndpointSchema` | Get input schema for a specific endpoint |
| `callEndpoint` | Execute an API call |

Best when you want minimal tool footprint and prefer to discover endpoints at runtime.

## Docker

### Build

```bash
docker build -t finiq/mcp-server .
```

### Run

```bash
docker run -i --rm \
  -e FINIQ_BASE_URL=https://your-finiq-instance.com \
  -e FINIQ_API_KEY=your-api-key \
  finiq/mcp-server
```

### Docker Compose

```bash
FINIQ_BASE_URL=https://your-finiq-instance.com \
FINIQ_API_KEY=your-api-key \
docker compose up
```

### Local Swagger File

Mount a local swagger.json to avoid fetching from the server:

```bash
docker run -i --rm \
  -e FINIQ_BASE_URL=https://your-finiq-instance.com \
  -e FINIQ_API_KEY=your-api-key \
  -e FINIQ_LOCAL_SWAGGER=/data/swagger.json \
  -v ./swagger.json:/data/swagger.json:ro \
  finiq/mcp-server
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start

# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm test

# Type check
npm run lint
```

**Requirements:** Node.js >= 18.0.0

## How It Works

1. On startup, fetches the OpenAPI/Swagger spec from the FinIQ instance (or reads a local file)
2. Parses the spec and filters to ABP application service endpoints (`/api/app/*`)
3. Generates MCP tool definitions with JSON schemas from OpenAPI operation schemas
4. Applies the selected tool mode (all/grouped/dynamic)
5. Starts an MCP server over stdio transport

Tool names follow the pattern `{service}_{action}`:
- `GET /api/app/warehouse` → `warehouse_getList`
- `GET /api/app/warehouse/{id}` → `warehouse_get`
- `POST /api/app/warehouse` → `warehouse_create`
- `PUT /api/app/warehouse/{id}` → `warehouse_update`
- `DELETE /api/app/warehouse/{id}` → `warehouse_delete`

## Tech Stack

- **TypeScript** — strict mode, ES2022 target
- **MCP SDK** — `@modelcontextprotocol/sdk`
- **Zod** — configuration validation
- **Vitest** — testing
- **Node.js 18+** — native fetch, ES modules

## License

[MIT](LICENSE)
