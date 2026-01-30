FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG CLAWDBOT_DOCKER_APT_PACKAGES=""
RUN if [ -n "$CLAWDBOT_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $CLAWDBOT_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN CLAWDBOT_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV CLAWDBOT_PREFER_PNPM=1
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"
ENV CLAWDBOT_STATE_DIR="/app/data/.clawdbot"
ENV CLAWDBOT_WORKSPACE_DIR="/app/data/clawd"
ENV CLAWDBOT_PREFER_PNPM="1"
ENV CLAWDBOT_NO_RESPAWN="1"
ENV CI="true"

# Create data directories and fix permissions
RUN mkdir -p /app/data/.clawdbot /app/data/clawd && chown -R node:node /app

USER node

# We use a shell to allow environment variable expansion (like $PORT)
CMD ["sh", "-c", "mkdir -p $CLAWDBOT_STATE_DIR $CLAWDBOT_WORKSPACE_DIR && ( [ ! -f $CLAWDBOT_STATE_DIR/moltbot.json ] && cp .clawdbot.json $CLAWDBOT_STATE_DIR/moltbot.json || true ) && node moltbot.mjs gateway run --bind lan --allow-unconfigured --port ${PORT:-80}"]
