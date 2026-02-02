FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

# Install Chromium and dependencies for headless browser, and dependencies for Homebrew
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    build-essential \
    procps \
    curl \
    file \
    git \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install Homebrew (Linuxbrew)
ENV HOMEBREW_PREFIX="/home/linuxbrew/.linuxbrew"
ENV PATH="${HOMEBREW_PREFIX}/bin:${HOMEBREW_PREFIX}/sbin:${PATH}"
RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && \
    if [ -d "$HOMEBREW_PREFIX" ]; then chown -R node:node "$HOMEBREW_PREFIX"; fi


# Set Chromium executable path for the browser module
ENV CHROMIUM_EXECUTABLE_PATH="/usr/bin/chromium"

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
