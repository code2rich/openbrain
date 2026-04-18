FROM node:20-alpine

RUN apk add --no-cache git dcron

WORKDIR /app

# Use China npm mirror
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install

# Install Claude Code CLI globally (use official npm for native arm64-musl binary)
RUN npm install -g @anthropic-ai/claude-code --registry=https://registry.npmjs.org

# Copy source code
COPY . .

# Make build script executable
RUN chmod +x scripts/build.sh && mkdir -p data/dream && mkdir -p /var/log

# Create claude config directory for skills/rules/CLAUDE.md
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node /app

# Content directories (will be mounted at runtime)
VOLUME /wiki-content
VOLUME /raw-content
VOLUME /claude-config

EXPOSE 80

# Run as non-root user (required by claude --dangerously-skip-permissions)
USER node

CMD ["scripts/build.sh"]
