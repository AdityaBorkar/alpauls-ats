import { Container, Network, Provider, Volume } from "@pulumi/docker";
import type { Input } from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";

import { getImages } from "./images";

export function setupServices({
  host,
  dbCredentials,
  domain,
}: {
  domain: Input<string>;
  host: Input<string>;
  dbCredentials: {
    username: Input<string>;
    password: Input<string>;
    name: Input<string>;
  };
}) {
  // ------------ Docker ------------

  const provider = new Provider("docker", { host });

  // ------------ Volumes ------------

  const images = getImages({ provider });

  // ------------ Volumes ------------

  const volumes = {
    caddyConfig: new Volume(
      "caddy-config",
      { name: "caddy-config" },
      { provider },
    ),
    caddyData: new Volume("caddy-data", { name: "caddy-data" }, { provider }),
    db: new Volume("db-data", { name: "db-data" }, { provider }),
  };

  // ------------ Network ------------

  const network = new Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider },
  );

  // ------------ Containers ------------

  const db = new Container(
    "db",
    {
      envs: [
        interpolate`POSTGRES_USER=${dbCredentials.username}`,
        interpolate`POSTGRES_PASSWORD=${dbCredentials.password}`,
        interpolate`POSTGRES_DB=${dbCredentials.name}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          interpolate`pg_isready -U ${dbCredentials.username}`,
        ],
        timeout: "5s",
      },
      image: images.postgres.id,
      mounts: [
        {
          source: volumes.db.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: provider },
  );

  const port = 3020;
  const app = new Container(
    "app",
    {
      envs: [],
      image: images.baseApp.id,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [db], provider: provider },
  );
  // TODO:
  // - Create a new Container
  // - Clone the Repository
  // - Install Dependencies
  // - Copy Environment Variables
  // - Run Checks
  // - Build the Application
  // - Run the Application
  // - Switch TO PRODUCTION PORT
  // - Edit the Caddy Config

  const caddyfileContent = interpolate`${domain} {
  reverse_proxy app:${port}
}`;

  const caddy = new Container(
    "caddy",
    {
      image: images.caddy.id,
      mounts: [
        { source: volumes.caddyData.name, target: "/data", type: "volume" },
        { source: volumes.caddyConfig.name, target: "/config", type: "volume" },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [{ content: caddyfileContent, file: "/etc/caddy/Caddyfile" }],
    },
    { dependsOn: [app], provider: provider },
  );

  return {
    networks: { network },
    services: { app, caddy, db },
    volumes,
  };
}
