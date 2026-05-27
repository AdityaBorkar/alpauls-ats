import { Image, type Provider } from "@pulumi/docker";

export function getImages({ provider }: { provider: Provider }) {
  const postgres = new Image(
    "docker-image-postgres",
    { imageName: "postgres:18-alpine" },
    { provider },
  );

  const caddy = new Image(
    "docker-image-caddy",
    { imageName: "caddy:2-alpine" },
    { provider },
  );

  const baseApp = new Image(
    "docker-image-baseApp",
    { imageName: "bun:1-alpine" },
    { provider },
  );

  return { baseApp, caddy, postgres };
}
