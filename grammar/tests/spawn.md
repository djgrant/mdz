SPAWN ~/agent/general TO task

SPAWN ~/agent/reporter WITH note that post is published

ASYNC SPAWN ~/agent/explore
TO explore codebase
WITH #explore-instructions

AWAIT SPAWN ~/agent/analyst
TO analyze report
WITH
  depth: "deep"
  strict: true
