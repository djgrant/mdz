# The model is the runtime: the program itself is the prompt.
#
#   make run
#   make run REPORT=path/to/report.html SRC_DIR=path/to/its/source

REPORT  ?= ../../research/phase-2/analysis/mdz-analysis-phase-2.html
SRC_DIR ?= ../../research/phase-2/analysis
MODEL   ?= opus

.PHONY: run

run:
	{ echo "\$$report = $(abspath $(REPORT))"; \
	  echo "\$$source = $(abspath $(SRC_DIR))"; \
	  echo; cat report-review.mdz; } | \
	claude -p --model $(MODEL) --permission-mode acceptEdits \
	  --add-dir $(abspath $(SRC_DIR))
