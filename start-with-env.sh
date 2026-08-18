#!/usr/bin/env bash
set -e
export HERMES_API_TOKEN="59dd6a0855d93a082fa79deae59b886cb9e367b7aebc99aad3a634fc437c8b50"
export HERMES_API_BASE="http://localhost:8766"
cd /home/node/repo-john-dashboard
exec npx next dev -p 3333
