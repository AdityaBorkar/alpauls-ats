import { Config } from "@pulumi/pulumi";

import { setupDockerServices } from "./docker/services";
import { setupInstance } from "./instance";
import { setupPostgres } from "./postgres";

const config = new Config();

const projectName = "alpauls-ats";
const compartmentId = config.require("ocid");
const sshPublicKey = config.require("sshPublicKey");

export const instance = setupInstance({
  compartmentId,
  projectName,
  sshPublicKey,
});
const host = instance.host;

// ----

const db = setupPostgres(
  {
    db_name: config.require("db_name"),
    password: config.requireSecret("db_password"),
    user: config.require("db_user"),
  },
  { host },
);

// const domain = setupDomain({}, { host });

const dbCredentials = {
  // ...
};

export const docker = setupDockerServices({
  appDomain: config.require("appDomain"),
  appImage: config.require("appImage"),
  betterAuthSecret: config.requireSecret("betterAuthSecret"),
  betterAuthUrl: config.require("betterAuthUrl"),
  dbCredentials,
  host,
  publicIp: instance.publicIp,
  publicPosthogHost: config.get("publicPosthogHost"),
  publicPosthogKey: config.get("publicPosthogKey"),
  publicR2PublicUrl: config.require("publicR2PublicUrl"),
  r2AccessKeyId: config.requireSecret("r2AccessKeyId"),
  r2AccountId: config.require("r2AccountId"),
  r2BucketName: config.require("r2BucketName"),
  r2SecretAccessKey: config.requireSecret("r2SecretAccessKey"),
  sshPrivateKey: config.requireSecret("sshPrivateKey"),
});
