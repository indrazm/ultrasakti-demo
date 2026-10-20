#!/usr/bin/env bash
set -euo pipefail

# This is the only command accepted by the dedicated deployment SSH key.
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec "$HOME/work/ultrasakti/deploy/deploy.sh" "${BASH_REMATCH[1]}"
fi
echo 'Only deploy <full-main-commit-sha> is allowed.' >&2
exit 1
