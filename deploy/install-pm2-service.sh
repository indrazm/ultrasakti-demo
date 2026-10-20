#!/usr/bin/env bash
set -euo pipefail
umask 077
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
node_path=$(command -v node)
pm2_path=$(command -v pm2)
unit_dir=$HOME/.config/systemd/user
mkdir -p "$unit_dir"
cat > "$unit_dir/pm2-ultrasakti.service" <<UNIT
[Unit]
Description=Ultra Sakti PM2 process manager
After=network.target

[Service]
Type=forking
Environment=PM2_HOME=$HOME/.pm2
Environment=PATH=$(dirname "$node_path"):$PNPM_HOME/bin:$PNPM_HOME:/usr/bin:/bin
PIDFile=$HOME/.pm2/pm2.pid
ExecStart=$pm2_path resurrect
ExecReload=$pm2_path reload ultrasakti
ExecStop=$pm2_path kill
Restart=on-failure
TimeoutStopSec=45

[Install]
WantedBy=default.target
UNIT
pm2 save
pm2 kill
systemctl --user daemon-reload
systemctl --user enable --now pm2-ultrasakti.service
systemctl --user is-active pm2-ultrasakti.service
