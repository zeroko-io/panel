#!/bin/bash
# The all-in-one image's start: the runner and the panel side by side. When
# either ends, the other is stopped and the container ends with it, so
# Docker's restart policy starts both again. A stop signal reaches both.
set -u

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
