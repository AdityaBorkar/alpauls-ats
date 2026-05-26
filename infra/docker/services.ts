import * as command from "@pulumi/command/remote";
import { Container, Image, Provider } from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export function setupDockerServices({
  sshPrivateKey,
  host,
  ...args
}: {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}) {
  // ------------ Docker ------------

  const provider = new Provider("docker", { host });

  // ------------ Volumes ------------

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider },
  );

  // ------------ Network ------------

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider },
  );

  // ------------ Containers ------------

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
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

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: provider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: provider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;

import * as command from "@pulumi/command/remote";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

interface DbCredentials {
  USER: pulumi.Input<string>;
  PASSWORD: pulumi.Input<string>;
  NAME: pulumi.Input<string>;
}

export interface DockerServicesArgs {
  publicIp: pulumi.Input<string>;
  sshPrivateKey: pulumi.Input<string>;
  appImage: pulumi.Input<string>;
  appDomain: pulumi.Input<string>;
  dbCredentials: DbCredentials;
  betterAuthSecret: pulumi.Input<string>;
  betterAuthUrl: pulumi.Input<string>;
  r2AccessKeyId: pulumi.Input<string>;
  r2SecretAccessKey: pulumi.Input<string>;
  r2AccountId: pulumi.Input<string>;
  r2BucketName: pulumi.Input<string>;
  publicR2PublicUrl: pulumi.Input<string>;
  publicPosthogKey?: pulumi.Input<string>;
  publicPosthogHost?: pulumi.Input<string>;
}

export function setupDockerServices(args: DockerServicesArgs) {
  const dockerProvider = new docker.Provider("docker-remote", {
    host: pulumi.interpolate`ssh://ubuntu@${args.publicIp}`,
    sshOpts: ["-o", "StrictHostKeyChecking=no"],
  });

  const sshConnection: command.ConnectionArgs = {
    host: args.publicIp,
    privateKey: args.sshPrivateKey,
    user: "ubuntu",
  };

  const network = new docker.Network(
    "alpauls-net",
    { driver: "bridge", name: "alpauls-net" },
    { provider: dockerProvider },
  );

  const dbDataVol = new docker.Volume(
    "db-data",
    { name: "db-data" },
    { provider: dockerProvider },
  );

  const caddyDataVol = new docker.Volume(
    "caddy-data",
    { name: "caddy-data" },
    { provider: dockerProvider },
  );

  const caddyConfigVol = new docker.Volume(
    "caddy-config",
    { name: "caddy-config" },
    { provider: dockerProvider },
  );

  const dbContainer = new docker.Container(
    "db",
    {
      envs: [
        pulumi.interpolate`POSTGRES_USER=${args.dbCredentials.USER}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${args.dbCredentials.PASSWORD}`,
        pulumi.interpolate`POSTGRES_DB=${args.dbCredentials.NAME}`,
      ],
      healthcheck: {
        interval: "5s",
        retries: 5,
        tests: [
          "CMD-SHELL",
          pulumi.interpolate`pg_isready -U ${args.dbCredentials.USER}`,
        ],
        timeout: "5s",
      },
      image: "postgres:18-alpine",
      mounts: [
        {
          source: dbDataVol.name,
          target: "/var/lib/postgresql/18/data",
          type: "volume",
        },
      ],
      name: "db",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { provider: dockerProvider },
  );

  const appContainer = new docker.Container(
    "app",
    {
      envs: [
        pulumi.interpolate`DATABASE_URL=postgresql://${args.dbCredentials.USER}:${args.dbCredentials.PASSWORD}@db:5432/${args.dbCredentials.NAME}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.betterAuthSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=${args.betterAuthUrl}`,
        pulumi.interpolate`R2_ACCESS_KEY_ID=${args.r2AccessKeyId}`,
        pulumi.interpolate`R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}`,
        pulumi.interpolate`R2_ACCOUNT_ID=${args.r2AccountId}`,
        pulumi.interpolate`R2_BUCKET_NAME=${args.r2BucketName}`,
        pulumi.interpolate`PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}`,
        pulumi.interpolate`PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}`,
        pulumi.interpolate`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`,
      ],
      image: args.appImage,
      name: "app",
      networksAdvanced: [{ name: network.name }],
      restart: "always",
    },
    { dependsOn: [dbContainer], provider: dockerProvider },
  );

  const caddyfileContent = pulumi.interpolate`${args.appDomain} {
  reverse_proxy app:3020
}`;

  const caddyContainer = new docker.Container(
    "caddy",
    {
      image: "caddy:2-alpine",
      mounts: [
        {
          source: caddyDataVol.name,
          target: "/data",
          type: "volume",
        },
        {
          source: caddyConfigVol.name,
          target: "/config",
          type: "volume",
        },
      ],
      name: "caddy",
      networksAdvanced: [{ name: network.name }],
      ports: [
        { external: 80, internal: 80, ip: "0.0.0.0", protocol: "tcp" },
        { external: 443, internal: 443, ip: "0.0.0.0", protocol: "tcp" },
      ],
      restart: "always",
      uploads: [
        {
          content: caddyfileContent,
          file: "/etc/caddy/Caddyfile",
        },
      ],
    },
    { dependsOn: [appContainer], provider: dockerProvider },
  );

  const envContent = pulumi.interpolate`APP_IMAGE=${args.appImage}
DB_USER=${args.dbCredentials.USER}
DB_PASSWORD=${args.dbCredentials.PASSWORD}
DB_NAME=${args.dbCredentials.NAME}
BETTER_AUTH_SECRET=${args.betterAuthSecret}
BETTER_AUTH_URL=${args.betterAuthUrl}
R2_ACCESS_KEY_ID=${args.r2AccessKeyId}
R2_SECRET_ACCESS_KEY=${args.r2SecretAccessKey}
R2_ACCOUNT_ID=${args.r2AccountId}
R2_BUCKET_NAME=${args.r2BucketName}
PUBLIC_R2_PUBLIC_URL=${args.publicR2PublicUrl}
PUBLIC_POSTHOG_KEY=${args.publicPosthogKey ?? ""}
PUBLIC_POSTHOG_HOST=${args.publicPosthogHost ?? ""}`;

  const writeEnvFile = new command.Command(
    "write-env-file",
    {
      connection: sshConnection,
      create: pulumi.interpolate`mkdir -p /opt/alpauls-ats && cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
      triggers: [envContent],
      update: pulumi.interpolate`cat > /opt/alpauls-ats/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
    },
    { dependsOn: [dbContainer, appContainer, caddyContainer] },
  );

  return {
    appContainer,
    caddyContainer,
    caddyContainerId: caddyContainer.id,
    dbContainer,
    dbContainerId: dbContainer.id,
    network,
    writeEnvFile,
  };
}

commandcommand / remotedockerdocker;
