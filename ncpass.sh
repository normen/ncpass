#!/usr/bin/env bash
set -e
realpath=$(realpath ${BASH_SOURCE[0]})
cd $(dirname $realpath)
node -r esm ncpass.js "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9"
