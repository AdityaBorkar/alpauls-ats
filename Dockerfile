FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.2-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/.output .output

EXPOSE 3020

CMD ["bun", "run", ".output/server/index.mjs"]
