export const APP_IMAGE = "ghcr.io/alpauls/alpauls-ats";

export const POSTGRES_IMAGE = "postgres:18-alpine";

export const CADDY_IMAGE = "caddy:2-alpine";

export interface ServiceConfig {
  image: string;
  restart: string;
  environment: Record<string, string>;
  volumes?: string[];
  ports?: string[];
  depends_on?: string[];
  healthcheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
}

export const dbService: ServiceConfig = {
  environment: {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    POSTGRES_DB: "${DB_NAME}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    POSTGRES_PASSWORD: "${DB_PASSWORD}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    POSTGRES_USER: "${DB_USER}",
  },
  healthcheck: {
    interval: "5s",
    retries: 5,
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"],
    timeout: "5s",
  },
  image: "postgres:18-alpine",
  restart: "always",
  volumes: ["db-data:/var/lib/postgresql/18/data"],
};

export const appService: ServiceConfig = {
  depends_on: ["db"],
  environment: {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    BETTER_AUTH_SECRET: "${BETTER_AUTH_SECRET}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    BETTER_AUTH_URL: "${BETTER_AUTH_URL}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    DATABASE_URL: "postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    PUBLIC_POSTHOG_HOST: "${PUBLIC_POSTHOG_HOST:-}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    PUBLIC_POSTHOG_KEY: "${PUBLIC_POSTHOG_KEY:-}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    PUBLIC_R2_PUBLIC_URL: "${PUBLIC_R2_PUBLIC_URL}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    R2_ACCESS_KEY_ID: "${R2_ACCESS_KEY_ID}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    R2_ACCOUNT_ID: "${R2_ACCOUNT_ID}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    R2_BUCKET_NAME: "${R2_BUCKET_NAME}",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
    R2_SECRET_ACCESS_KEY: "${R2_SECRET_ACCESS_KEY}",
  },
  // biome-ignore lint/suspicious/noTemplateCurlyInString: Docker Compose variable substitution
  image: "${APP_IMAGE}",
  restart: "always",
};

export const caddyService: ServiceConfig = {
  depends_on: ["app"],
  image: "caddy:2-alpine",
  ports: ["80:80", "443:443"],
  restart: "always",
  volumes: [
    "./Caddyfile:/etc/caddy/Caddyfile:ro",
    "caddy-data:/data",
    "caddy-config:/config",
  ],
};

// const caddyBlock = args.appDomain
//   ? `${args.appDomain} {\n  reverse_proxy app:3020\n}`
//   : `:80 {\n  reverse_proxy app:3020\n}`;

// const envLines = [
//   `APP_IMAGE=${args.appImage}`,
//   `DB_USER=${args.dbCredentials.USER}`,
//   `DB_PASSWORD=${dbPw}`,
//   `DB_NAME=${args.dbCredentials.NAME}`,
//   `BETTER_AUTH_SECRET=${authSecret}`,
//   `BETTER_AUTH_URL=${args.betterAuthUrl}`,
//   `R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
//   `R2_SECRET_ACCESS_KEY=${r2Secret}`,
//   `R2_ACCOUNT_ID=${args.r2AccountId}`,
//   `R2_BUCKET_NAME=${args.r2BucketName}`,
//   `PUBLIC_R2_PUBLIC_URL=${args.r2PublicUrl}`,
// ];

// if (args.publicPosthogKey) {
//   envLines.push(`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey}`);
// }
// if (args.publicPosthogHost) {
//   envLines.push(`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost}`);
// }
// write_files:
//   - path: /opt/alpauls-ats/docker-compose.yml
//     content: |
//       name: alpauls-ats

//       services:
//         db:
//           image: postgres:18-alpine
//           restart: always
//           environment:
//             POSTGRES_USER: \${DB_USER}
//             POSTGRES_PASSWORD: \${DB_PASSWORD}
//             POSTGRES_DB: \${DB_NAME}
//           volumes:
//             - db-data:/var/lib/postgresql/18/data
//           healthcheck:
//             test: ["CMD-SHELL", "pg_isready -U \${DB_USER}"]
//             interval: 5s
//             timeout: 5s
//             retries: 5
//           networks:
//             - alpauls-net

//         app:
//           image: \${APP_IMAGE}
//           restart: always
//           depends_on:
//             db:
//               condition: service_healthy
//           environment:
//             DATABASE_URL: postgresql://\${DB_USER}:\${DB_PASSWORD}@db:5432/\${DB_NAME}
//             BETTER_AUTH_SECRET: \${BETTER_AUTH_SECRET}
//             BETTER_AUTH_URL: \${BETTER_AUTH_URL}
//             R2_ACCESS_KEY_ID: \${R2_ACCESS_KEY_ID}
//             R2_SECRET_ACCESS_KEY: \${R2_SECRET_ACCESS_KEY}
//             R2_ACCOUNT_ID: \${R2_ACCOUNT_ID}
//             R2_BUCKET_NAME: \${R2_BUCKET_NAME}
//             PUBLIC_R2_PUBLIC_URL: \${PUBLIC_R2_PUBLIC_URL}
//             PUBLIC_POSTHOG_KEY: \${PUBLIC_POSTHOG_KEY:-}
//             PUBLIC_POSTHOG_HOST: \${PUBLIC_POSTHOG_HOST:-}
//           networks:
//             - alpauls-net

//         caddy:
//           image: caddy:2-alpine
//           restart: always
//           ports:
//             - "80:80"
//             - "443:443"
//           volumes:
//             - ./Caddyfile:/etc/caddy/Caddyfile:ro
//             - caddy-data:/data
//             - caddy-config:/config
//           depends_on:
//             - app
//           networks:
//             - alpauls-net

//       volumes:
//         db-data:
//         caddy-data:
//         caddy-config:

//       networks:
//         alpauls-net:
//           driver: bridge
//     owner: root:root
//     permissions: "0644"
//   - path: /opt/alpauls-ats/Caddyfile
//     content: |
//       ${caddyBlock}
//     owner: root:root
//     permissions: "0644"
//   - path: /opt/alpauls-ats/.env
//     content: |
//       ${envLines.join("\n")}
//     owner: root:root
//     permissions: "0600"
// - echo '${ghcrPat}' | docker login ghcr.io -u '_' --password-stdin
// - cd /opt/alpauls-ats && docker compose --env-file .env up -d
