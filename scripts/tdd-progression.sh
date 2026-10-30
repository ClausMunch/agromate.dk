#!/bin/sh
# Assert an actual expected test outcome and retain the complete TAP transcript.
set -u
export TMPDIR=${TMPDIR:-/home/munch/.hermes/cache/scratch}
phase=$1; shift
log="$TMPDIR/agromate-repair/tdd.log"
mkdir -p "$(dirname "$log")"
printf '\n%s %s\n' "$(date -Iseconds)" "$phase $*" >> "$log"
"$@" > "$TMPDIR/agromate-repair/last-test.log" 2>&1
result=$?
cat "$TMPDIR/agromate-repair/last-test.log" >> "$log"
tail -12 "$TMPDIR/agromate-repair/last-test.log"
case "$phase:$result" in green:0) exit 0;; red:0) echo 'Unexpected green: RED not established'; exit 1;; red:*) exit 0;; *) exit "$result";; esac
