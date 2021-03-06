#!/bin/bash

#you can bypass this hook by `git commit --no-verify`

set -e #exit immediately on `exit status > 0` of any command
set -o pipefail #exit immediately on `exit status > 0` for pipes

npm run lint --silent
#npm run lint:test --silent
npm run test --silent -- --reporter min
