FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY bin/ bin/
RUN npm run build

FROM node:18-alpine
WORKDIR /app
LABEL org.opencontainers.image.title="FinIQ MCP Server"
LABEL org.opencontainers.image.description="MCP server for Finance (FinIQ) API"
LABEL mcp.transport="stdio"
RUN addgroup -g 1001 -S mcpuser && adduser -S mcpuser -u 1001
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist/ dist/
USER mcpuser
ENTRYPOINT ["node", "dist/bin/finiq-mcp.js"]
