import { execSync } from "node:child_process";

const IMAGE_NAME = process.env.APP_IMAGE || "ghcr.io/alpauls/alpauls-ats";
const DEPLOY_HOST = process.env.DEPLOY_HOST;
const DEPLOY_USER = process.env.DEPLOY_USER || "ubuntu";
const DEPLOY_PATH = process.env.DEPLOY_PATH || "/opt/alpauls-ats";

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function getGitSha() {
  return execSync("git rev-parse --short HEAD").toString().trim();
}

function main() {
  if (!DEPLOY_HOST) {
    console.error("DEPLOY_HOST is required (e.g. user@1.2.3.4 or just the IP)");
    process.exit(1);
  }

  const sha = getGitSha();
  const tagLatest = `${IMAGE_NAME}:latest`;
  const tagSha = `${IMAGE_NAME}:${sha}`;

  console.log(`\n=== Building image ===`);
  run(`docker build -t ${tagLatest} -t ${tagSha} .`);

  console.log(`\n=== Pushing to GHCR ===`);
  run(`docker push ${tagLatest}`);
  run(`docker push ${tagSha}`);

  const sshTarget = `${DEPLOY_USER}@${DEPLOY_HOST}`;

  console.log(`\n=== Deploying to ${sshTarget} ===`);

  const updateEnvImage = `sed -i 's|^APP_IMAGE=.*|APP_IMAGE=${tagSha}|' ${DEPLOY_PATH}/.env`;

  const deployCmd = [
    `set -e`,
    updateEnvImage,
    `cd ${DEPLOY_PATH}`,
    `docker compose pull app`,
    `docker compose up -d app`,
    `docker image prune -f`,
  ].join(" && ");

  run(`ssh ${sshTarget} '${deployCmd}'`);

  console.log(`\n=== Deployed ${tagSha} ===`);
}

main();
