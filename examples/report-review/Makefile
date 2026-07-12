REPORT ?= $(abspath ../../research/phase-2/analysis/mdz-analysis-phase-2.html)
SOURCE ?= $(abspath ../../research/phase-2/analysis)
MODEL  ?= opus
PROMPT ?=

.PHONY: run
run:
	sed -e 's|{{REPORT}}|$(REPORT)|g' \
	    -e 's|{{SOURCE}}|$(SOURCE)|g' \
	    program.mdz | \
	claude -p --model $(MODEL) --permission-mode acceptEdits \
	  --add-dir $(SOURCE)
