DELEGATE task TO ~/agent/explorer
ASYNC DELEGATE explore TO ~/agent/explorer WITH #context
AWAIT DELEGATE analyze TO ~/agent/analyzer WITH:
  depth: "deep"
  strict: true
