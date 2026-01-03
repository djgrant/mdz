---
name: the-scientist
description: When orchestrating hypothesis-driven iteration with sub-agents
uses:
  - work-packages
  - scientific-method
---

## Types

$Hypothesis = a testable prediction about what will solve the problem
$Experiment = a concrete action to test a hypothesis
$Observation = data collected from running an experiment
$Conclusion = "confirmed" | "refuted" | "inconclusive"
$ValidationResult = "progress" | "regression" | "plateau"
$Strategy = "accumulate" | "independent"

## Input

- $problem: $String = the problem to solve
- $maxIterations: $Number = 5
- $strategy: $Strategy = "accumulate"

## Context

- $currentHypothesis: $Hypothesis
- $experiments: $Experiment[]
- $observations: $Observation[]
- $iteration = 0
- $workPackagePath = $n => `{~~work package directory}/wp-experiment-{$n}.md`

## Workflow

### 1. Initialize

1. Create master work package at {~~appropriate location for tracking}
2. Analyze $problem to identify potential hypotheses
3. Prioritize hypotheses by {~~likelihood of success and ease of testing}
4. Set $currentHypothesis to the highest priority hypothesis

### 2. Experiment Loop

WHILE (NOT diminishing returns AND $iteration < $maxIterations):
  
  #### 2a. Design Experiment
  
  1. Create experiment work package at $workPackagePath($iteration)
  2. Define experiment steps to test $currentHypothesis
  3. Establish success criteria that are {~~measurable and objective}
  
  #### 2b. Run Experiment
  
  Delegate to sub-agent with [[#experiment-prompt]]:
    - The experiment work package
    - Access to [[work-packages]] skill
  
  #### 2c. Observe Results
  
  1. Read experiment work package results
  2. Extract $observations from the results
  3. Update master work package with findings
  
  #### 2d. Evaluate
  
  1. Determine $result: $ValidationResult by comparing to success criteria
  
  IF $result = "progress" THEN:
    - IF $strategy = "accumulate" THEN:
      - Commit changes from experiment
      - Update $currentHypothesis based on learnings
    - ELSE:
      - Record successful approach for later synthesis
    - Continue to next iteration
  ELSE:
    - IF $result = "regression" THEN:
      - Revert experiment changes
      - Record what didn't work
    - ELSE:
      - Record plateau condition
    - Revise $currentHypothesis or select next hypothesis
  
  2. Increment $iteration

### 3. Conclude

1. Synthesize findings from all experiments
2. Document final $conclusion in master work package
3. Move work packages to completed directory
4. Report summary with:
   - Original problem
   - Hypotheses tested
   - Final conclusion
   - Recommendations

## Experiment Prompt

You are running an experiment to test a hypothesis.

### Your Task

Read the work package provided and execute the experiment steps precisely.

### Methodology

1. Read the hypothesis carefully
2. Follow experiment steps exactly as written
3. Record observations objectively
4. Do not interpret results—just report what happened
5. Update the work package Results section

### Important

- Stay within scope defined in the work package
- Do not make changes outside the experiment
- Report honestly, even if results are unexpected
