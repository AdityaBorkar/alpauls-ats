import { core, identity } from "@pulumi/oci";
import type { InternetGateway, Vcn } from "@pulumi/oci/core";
import type { Output } from "@pulumi/pulumi";

export function configureDatabaseInstance(
  {
    dbCredentials,
    sshPublicKey,
  }: {
    sshPublicKey: string;
    dbCredentials: {
      NAME: string;
      PASSWORD: Output<string>;
      USER: string;
    };
  },
  {
    compartmentId,
    vcn,
    igw,
  }: {
    compartmentId: string;
    vcn: Vcn;
    igw: InternetGateway;
  },
) {
  const DB_PRIVATE_IP = "10.0.2.10";

  const routeTable = new core.RouteTable("db-rt", {
    compartmentId,
    displayName: "db-rt",
    routeRules: [{ destination: "0.0.0.0/0", networkEntityId: igw.id }],
    vcnId: vcn.id,
  });

  const securityList = new core.SecurityList("db-sl", {
    compartmentId,
    displayName: "db-sl",
    egressSecurityRules: [{ destination: "0.0.0.0/0", protocol: "all" }],
    ingressSecurityRules: [
      {
        protocol: "6",
        source: "10.0.1.0/24",
        tcpOptions: { sourcePortRange: { max: 5432, min: 5432 } },
      },
      {
        protocol: "6",
        source: "0.0.0.0/0",
        tcpOptions: { sourcePortRange: { max: 22, min: 22 } },
      },
    ],
    vcnId: vcn.id,
  });

  const subnet = new core.Subnet("db-subnet", {
    cidrBlock: "10.0.2.0/24",
    compartmentId,
    displayName: "db-subnet",
    dnsLabel: "dbsub",
    routeTableId: routeTable.id,
    securityListIds: [securityList.id],
    vcnId: vcn.id,
  });

  const ads = identity.getAvailabilityDomainsOutput({ compartmentId });

  const images = core.getImagesOutput({
    compartmentId,
    operatingSystem: "Canonical Ubuntu",
    operatingSystemVersion: "22.04",
    shape: "VM.Standard.A1.Flex",
  });

  const userData = dbCredentials.PASSWORD.apply((pw) => {
    const cloudInit = `#cloud-config
package_update: true
package_upgrade: true

packages:
  - wget
  - curl
  - python3-psycopg2
  - ufw

write_files:
  - path: /etc/postgresql/16/main/pg_hba_app.conf
    content: |
      # Allow password-authenticated connections from app subnet
      host    all             all             10.0.1.0/24            md5
    permissions: "0644"

runcmd:
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
  - echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/postgresql.list
  - apt-get update
  - apt-get install -y postgresql-16

  - sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
  - cat /etc/postgresql/16/main/pg_hba_app.conf >> /etc/postgresql/16/main/pg_hba.conf

  - su - postgres -c "psql -c \\"ALTER USER ${args.dbUser} WITH PASSWORD '${pw}';\\""
  - su - postgres -c "psql -c \\"CREATE DATABASE ${args.dbName};\\""

  - systemctl restart postgresql
  - systemctl enable postgresql

  - ufw allow 22/tcp
  - ufw allow 5432/tcp
  - ufw --force enable
`;
    return Buffer.from(cloudInit).toString("base64");
  });

  const instance = new core.Instance("db-vm", {
    availabilityDomain: ads.availabilityDomains[0].name,
    compartmentId,
    // LIVE MIGRATION
    // OCI Cloud Agent
    // Block Volume Management
    // Cloud Guard Workload Protection
    // Compute Instance Monitoring
    // Custom Logs Monitoring
    createVnicDetails: {
      assignPublicIp: "true",
      hostnameLabel: "db",
      privateIp: DB_PRIVATE_IP,
      subnetId: subnet.id,
    },
    displayName: "alpauls-ats-db",
    metadata: {
      ssh_authorized_keys: sshPublicKey,
      user_data: userData,
    },
    shape: "VM.Standard.A1.Flex",
    shapeConfig: {
      memoryInGbs: 4,
      ocpus: 1,
    },
    sourceDetails: {
      bootVolumeSizeInGbs: "50",
      imageId: images.id,
      sourceType: "image",
    },
  });

  return { instance };
}
