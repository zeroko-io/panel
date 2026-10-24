#!/bin/bash
# The all-in-one image's start: the runner and the panel side by side. When
# either ends, the other is stopped and the container ends with it, so
# Docker's restart policy starts both again. A stop signal reaches both.
set -u

# The runner's root token, which the panel uses too. Never a fixed one: the
# panel's /api passes tokens through, so the root token must stay secret.
# Without ZEROKO_TOKEN, one is made on the first start and kept in /data.
if [ -z "${ZEROKO_TOKEN:-}" ]; then
  file=/data/.root-token
  if [ ! -s "$file" ]; then
    (umask 077 && head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' >"$file")
  fi
  ZEROKO_TOKEN=$(cat "$file")
  export ZEROKO_TOKEN
fi

/usr/bin/runner &
runner=$!
setpriv --reuid=node --regid=node --init-groups node /app/server.js &
panel=$!

trap 'kill -TERM "$runner" "$panel" 2>/dev/null' TERM INT
wait -n "$runner" "$panel"
code=$?
kill -TERM "$runner" "$panel" 2>/dev/null
wait
exit "$code"
