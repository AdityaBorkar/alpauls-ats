import { core } from "@pulumi/oci";
import { Config } from "@pulumi/pulumi";

import { configureAppInstance } from "./app";
import { configureDatabaseInstance } from "./db";

// -----

const config = new Config();

const compartmentId = config.require("ocid");
const sshPublicKey = config.require("sshPublicKey");
const dbCredentials = {
  NAME: config.require("db_name"),
  PASSWORD: config.requireSecret("db_password"),
  USER: config.require("db_user"),
};

// -----

const vcn = new core.Vcn("alpauls-ats-vcn", {
  cidrBlocks: ["10.0.0.0/16"],
  compartmentId,
  displayName: "alpauls-ats-vcn",
  dnsLabel: "alpauls-ats",
});

const igw = new core.InternetGateway("alpauls-ats-igw", {
  compartmentId,
  displayName: "alpauls-ats-igw",
  enabled: true,
  vcnId: vcn.id,
});

// -----

const db = configureDatabaseInstance(
  { dbCredentials, sshPublicKey },
  { compartmentId, igw, vcn },
);

const app = configureAppInstance({ sshPublicKey }, { compartmentId, igw, vcn });

// -----

// TODO: HANDLE DEPLOYS and MIGRATIONS and SKEW PROTECTIONS
