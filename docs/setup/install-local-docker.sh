#!/usr/bin/env bash
# Run locally: sudo bash docs/setup/install-local-docker.sh
# Debian-packaged Docker supports this machine's SysVinit as well as systemd.
# Adds the invoking user to docker (root-equivalent Docker daemon access).
set -euo pipefail

if [[ ${EUID} -ne 0 || -z ${SUDO_USER:-} || ${SUDO_USER} == root ]]; then
  echo 'Run this script with sudo from your normal user account.' >&2
  exit 1
fi
. /etc/os-release
if [[ ${ID:-} != debian || ${VERSION_ID:-} != 13 ]]; then
  echo 'This reviewed installation script targets Debian 13 only.' >&2
  exit 1
fi
for package in docker-ce docker-ce-cli containerd.io podman-docker; do
  if dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -qx 'install ok installed'; then
    echo "Existing $package installation found; stop and review before mixing Docker packages." >&2
    exit 1
  fi
done

apt-get update
apt-get install -y --no-remove --no-install-recommends docker.io docker-cli
if [[ -d /run/systemd/system ]]; then
  systemctl start docker
else
  service docker start
fi
usermod -aG docker "$SUDO_USER"
docker info --format 'Docker server: {{.ServerVersion}}'
docker run --rm hello-world

echo 'Docker is installed. Log out and back in to activate Docker group membership.'
echo 'Then tell Codex to continue local Supabase setup. No Supabase data was reset by this script.'
