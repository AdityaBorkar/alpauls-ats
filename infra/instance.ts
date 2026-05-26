import { core, identity } from "@pulumi/oci";

export function setupInstance({
  projectName,
  compartmentId,
  sshPublicKey,
}: {
  projectName: string;
  sshPublicKey: string;
  compartmentId: string;
}) {
  // ------------ Network ------------

  const vcn = new core.Vcn(`${projectName}-vcn`, {
    cidrBlocks: ["10.0.0.0/16"],
    compartmentId,
    displayName: `${projectName}-vcn`,
    dnsLabel: `${projectName}-vcn`,
  });

  const igw = new core.InternetGateway(`${projectName}-igw`, {
    compartmentId,
    displayName: `${projectName}-igw`,
    enabled: true,
    vcnId: vcn.id,
  });

  // ------------ Network ------------

  const routeTable = new core.RouteTable(`${projectName}-rt`, {
    compartmentId,
    displayName: `${projectName}-rt`,
    routeRules: [{ destination: "0.0.0.0/0", networkEntityId: igw.id }],
    vcnId: vcn.id,
  });

  const securityList = new core.SecurityList(`${projectName}-sl`, {
    compartmentId,
    displayName: `${projectName}-sl`,
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

  const subnet = new core.Subnet(`${projectName}-subnet`, {
    cidrBlock: "10.0.1.0/24",
    compartmentId,
    displayName: `${projectName}-subnet`,
    dnsLabel: `${projectName}-subnet`,
    routeTableId: routeTable.id,
    securityListIds: [securityList.id],
    vcnId: vcn.id,
  });

  // ------------ Instance ------------

  const ads = identity.getAvailabilityDomainsOutput({ compartmentId });

  const images = core.getImagesOutput({
    compartmentId,
    operatingSystem: "Canonical Ubuntu",
    operatingSystemVersion: "22.04",
    shape: "VM.Standard.A1.Flex",
  });

  const userData = `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - ufw
  - ca-certificates
  - gnupg
  - docker

runcmd:
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  - echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  - systemctl enable docker
  - systemctl start docker
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable
`;

  const instance = new core.Instance(`${projectName}-vm`, {
    availabilityDomain: ads.availabilityDomains[0].name,
    compartmentId,
    createVnicDetails: {
      assignPublicIp: "true",
      hostnameLabel: `${projectName}-vm`,
      privateIp: "10.0.1.10",
      subnetId: subnet.id,
    },
    displayName: `${projectName}-vm`,
    metadata: {
      ssh_authorized_keys: sshPublicKey,
      user_data: userData,
    },
    shape: "VM.Standard.A1.Flex",
    shapeConfig: {
      memoryInGbs: 6,
      ocpus: 1,
    },
    sourceDetails: {
      bootVolumeSizeInGbs: "50",
      sourceId: images.id,
      sourceType: "image",
    },
  });

  const host = instance.publicIp;

  return { host, igw, instance, vcn };
}
