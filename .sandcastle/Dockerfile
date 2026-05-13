FROM node:22-bookworm
# FROM oven/bun:1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends git curl jq ca-certificates \
    && update-ca-certificates

# GitHub CLI in single layer, no recommends
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN groupmod -g $AGENT_GID node && usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
# RUN groupmod -g $AGENT_GID bun && usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent bun

RUN npm install -g opencode-ai
RUN npm install -g @upstash/context7-mcp tavily-mcp opencode-ai
RUN curl -fsSL https://codedb.codegraff.com/install.sh | bash

USER ${AGENT_UID}:${AGENT_GID}
WORKDIR /home/agent
ENTRYPOINT ["sleep", "infinity"]
