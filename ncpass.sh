#!/usr/bin/env bash
# get realpath of the script, go to folder and execute node -r esm ncpass.js
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR
node -r esm ncpass.js $@
