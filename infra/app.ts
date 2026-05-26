import { core, identity } from "@pulumi/oci";
import type { InternetGateway, Vcn } from "@pulumi/oci/core";

export function configureAppInstance(
  {
    sshPublicKey,
  }: {
    sshPublicKey: string;
    dbPrivateIp: string;
    appDomain: string;
    repoUrl: string;
    repoBranch: string;
  },
  {
    igw,
    vcn,
    compartmentId,
  }: {
    compartmentId: string;
    igw: InternetGateway;
    vcn: Vcn;
  },
) {
  const APP_PRIVATE_IP = "10.0.1.10";

  const routeTable = new core.RouteTable("app-rt", {
    compartmentId,
    displayName: "app-rt",
    routeRules: [{ destination: "0.0.0.0/0", networkEntityId: igw.id }],
    vcnId: vcn.id,
  });

  const securityList = new core.SecurityList("app-sl", {
    compartmentId,
    displayName: "app-sl",
    egressSecurityRules: [{ destination: "0.0.0.0/0", protocol: "all" }],
    ingressSecurityRules: [
      {
        protocol: "6",
        source: "0.0.0.0/0",
        tcpOptions: { sourcePortRange: { max: 22, min: 22 } },
      },
      {
        protocol: "6",
        source: "0.0.0.0/0",
        tcpOptions: { sourcePortRange: { max: 80, min: 80 } },
      },
      {
        protocol: "6",
        source: "0.0.0.0/0",
        tcpOptions: { sourcePortRange: { max: 443, min: 443 } },
      },
    ],
    vcnId: vcn.id,
  });

  const subnet = new core.Subnet("app-subnet", {
    cidrBlock: "10.0.1.0/24",
    compartmentId,
    displayName: "app-subnet",
    dnsLabel: "appsub",
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

  const userData = pulumi
    .all([
      args.dbPassword,
      args.betterAuthSecret,
      args.r2AccessKeyId,
      args.r2SecretAccessKey,
      args.publicPosthogKey,
    ])
    .apply(([dbPw, authSecret, r2Key, r2Secret, posthogKey]) => {
      const caddyBlock = args.appDomain
        ? `${args.appDomain} {\n  reverse_proxy localhost:3020\n}`
        : `:80 {\n  reverse_proxy localhost:3020\n}`;

      const envLines = [
        `DATABASE_URL=postgresql://${args.dbUser}:${dbPw}@${args.dbPrivateIp}:5432/${args.dbName}`,
        `BETTER_AUTH_SECRET=${authSecret}`,
        `BETTER_AUTH_URL=${args.betterAuthUrl}`,
        `R2_ACCESS_KEY_ID=${r2Key}`,
        `R2_SECRET_ACCESS_KEY=${r2Secret}`,
        `R2_ACCOUNT_ID=${args.r2AccountId}`,
        `R2_BUCKET_NAME=${args.r2BucketName}`,
        `R2_PUBLIC_URL=${args.r2PublicUrl}`,
      ];

      if (posthogKey) {
        envLines.push(`PUBLIC_POSTHOG_KEY=${posthogKey}`);
      }
      if (args.publicPosthogHost) {
        envLines.push(`PUBLIC_POSTHOG_HOST=${args.publicPosthogHost}`);
      }

      const cloneBlock = args.repoUrl
        ? `git clone --branch ${args.repoBranch} ${args.repoUrl} /opt/alpauls-ats/app`
        : "echo 'No repoUrl configured — deploy app manually to /opt/alpauls-ats/app'";

      const buildBlock = args.repoUrl
        ? `su - alpauls -c "cd /opt/alpauls-ats/app && /home/alpauls/.bun/bin/bun install && /home/alpauls/.bun/bin/bun run build"`
        : "echo 'Skipping build — no repoUrl configured'";

      const cloudInit = `#cloud-config
package_update: true
package_upgrade: true

packages:
  - git
  - curl
  - ufw

users:
  - name: alpauls
    system: false
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL

write_files:
  - path: /etc/caddy/Caddyfile
    content: |
      ${caddyBlock}
    owner: caddy:caddy
    permissions: "0644"
  - path: /opt/alpauls-ats/.env.local
    content: |
      ${envLines.join("\n")}
    owner: alpauls:alpauls
    permissions: "0600"
  - path: /etc/systemd/system/alpauls-ats.service
    content: |
      [Unit]
      Description=Alpauls ATS
      After=network.target

      [Service]
      Type=simple
      User=alpauls
      WorkingDirectory=/opt/alpauls-ats/app
      ExecStart=/home/alpauls/.bun/bin/bun run .output/server/index.mjs
      Restart=always
      RestartSec=5
      EnvironmentFile=/opt/alpauls-ats/.env.local

      [Install]
      WantedBy=multi-user.target

runcmd:
  - install -d -o alpauls -g alpauls /opt/alpauls-ats/app
  - ${cloneBlock}
  - su - alpauls -c "curl -fsSL https://bun.sh/install | bash"
  - ${buildBlock}
  - install -m 0755 -d /usr/share/keyrings
  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - apt-get install -y caddy
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable
  - systemctl enable caddy
  - systemctl start caddy
  - systemctl enable alpauls-ats
  - systemctl start alpauls-ats
`;
      return Buffer.from(cloudInit).toString("base64");
    });

  const instance = new core.Instance("app-vm", {
    availabilityDomain: ads.availabilityDomains[0].name,
    compartmentId,
    createVnicDetails: {
      assignPublicIp: "true",
      hostnameLabel: "app",
      privateIp: APP_PRIVATE_IP,
      subnetId: subnet.id,
    },
    displayName: "alpauls-ats-app",
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
      bootVolumeSizeInGbs: 50,
      imageId: images.id,
      sourceType: "image",
    },
  });

  return { instance };
}
