SPAWN ~/agent/alpha TO task

ASYNC SPAWN ~/agent/alpha
- TO explore
- WITH #context

AWAIT SPAWN ~/agent/alpha
- TO analyze
- WITH
  - depth: "deep"
  - strict: true
