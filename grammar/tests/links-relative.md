USE ./skill/alpha

USE ./skill/alpha WITH
  p1: val

USE ../shared/skill/beta

SPAWN ./agents/worker

SPAWN /opt/agents/worker

$snippet = ./resources/notes
