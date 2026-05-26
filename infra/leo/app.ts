import { Provider } from "@pulumi/docker";

export function configureLeoApp({
  host,
  projectName,
}: {
  host: string;
  projectName: string;
}) {
  const provider = new Provider(`leo-docker-${projectName}`, { host });

  // TODO: SETUP AN APP FOR SYSTEM MONITORING AND DOCKER MONITORING
  // - Tanstack App with System Monitor (WS)
  // - External Facing API for Deployments
  // - Connect to N instances and configure them
  // - Database = SQLite
  // - Logging = Clickhouse
  //
  //  TODO: DEPLOYMENTS: ENVIRONMENT / CI-CD / ROLLBACKS / SKEW PROTECTION / ROLLING RELEASES
  // - Start a Docker Container
  // - Clone the Repository
  // - Install Dependencies
  // - Build the Application
  // - Run the Application
  // - Switch TO PRODUCTION
  //
  // TODO: REMOTE BUILDS (USE GITHUB ACTIONS)
  //
  // TODO: FIREWALL / RATE LIMITING / DDOS / CDN
  // TODO: MANAGED STORAGE / MANAGED DATABASE / MANAGED BACKUPS / MANAGED WORKFLOWS-QUEUES-CRONS / MANAGED AI-GATEWAY / MANAGED OBSERVABILITY

  return provider;
}

// TODO: SEEK INSPIRATION FROM SST
// TODO: SEEK INSPIRATION FROM SST.Vercel Provider
//
// const provider = new Leo.Provider({ apiKey: "", host: instance.host });
// new Leo.Postgres({}, { provider })
// new Leo.Domain({}, { provider })
// new Leo.TanstackStartApp({}, { provider })
