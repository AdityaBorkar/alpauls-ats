import { Config, getStack } from "@pulumi/pulumi";

import { setupServices } from "./docker/services";
import { setupInstance } from "./instance";

const STACK_NAME = getStack();
const config = new Config();
const projectName = "alpauls-ats";
const compartmentId = config.require("ocid");
const sshPublicKey = config.require("sshPublicKey");
const dbCredentials = {
  name: config.require("db_name"),
  password: config.requireSecret("db_password"),
  username: config.require("db_username"),
};

const instance =
  STACK_NAME === "development"
    ? { host: "/var/run/docker.sock" }
    : setupInstance({
        compartmentId,
        projectName,
        sshPublicKey,
      });

export const docker = setupServices({
  dbCredentials,
  host: instance.host,
});
