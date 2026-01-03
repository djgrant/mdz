---
name: database-query-optimization
description: When optimizing database query performance through hypothesis-driven experimentation
uses:
  - scientific-method
  - work-packages
---

## Types

$Hypothesis = testable prediction about what will improve query performance
$Experiment = concrete action to test query optimization hypothesis  
$Query = database query statement
$Metric = query execution time or resource consumption
$OptimizationStrategy = "add-index" | "rewrite-query" | "adjust-schema" | "cache-results"
$BaselineResult = performance measurement before optimization
$OptimizedResult = performance measurement after optimization

## Input

- $problem: $String = "optimize database queries"
- $queries: $Query[] = list of queries to optimize
- $targetMetric: $Metric = "execution time"

## Context

- $hypothesis: $Hypothesis
- $baseline: $BaselineResult
- $results: $OptimizedResult
- $strategy: $OptimizationStrategy
- $reportPath: $FilePath = "{~~experiments directory}/database-optimization-report.md"

## Workflow

### 1. Analyze Problem

1. Identify slow queries from $queries
2. Collect baseline performance metrics for each query
3. Analyze query execution plans
4. Identify potential optimization points
5. Write baseline findings to {~~appropriate location}

### 2. Formulate Hypothesis

Set $hypothesis = "Adding appropriate indexes to frequently queried columns will reduce query execution time by 50% or more"

Document hypothesis in {~~hypothesis tracking file}

### 3. Design Experiment

Define experiment steps:
- Select candidate queries for testing
- Identify columns for indexing based on WHERE/JOIN/GROUP BY clauses
- Create indexes without affecting production
- Run queries and measure performance

Establish success criteria:
- Query execution time reduced by >= 50%
- No degradation in other queries
- Minimal impact on write operations

Write experiment design to $reportPath

### 4. Execute Experiment

Delegate to sub-agent with [[#experiment-execution-prompt]]:
  - $hypothesis
  - Selected queries
  - Performance measurement tool
  - Test database connection

### 5. Collect Results

1. Measure $baseline before optimization
2. Measure $results after applying optimizations
3. Compare $results against $baseline
4. Document findings in $reportPath

### 6. Evaluate Results

IF ($results.execution_time <= $baseline.execution_time * 0.5) THEN:
  - Hypothesis confirmed
  - Recommend production deployment
  - Document optimization strategy
ELSE:
  - Hypothesis refuted or inconclusive
  - Analyze why optimization failed
  - Propose alternative hypothesis

Write evaluation to $reportPath

### 7. Iterate (Optional)

IF results inconclusive OR performance insufficient THEN:
  - Revise hypothesis with different $strategy
  - Repeat from step 3 with new strategy
  - Compare multiple strategies

Document iteration history in {~~iteration tracking file}

## Experiment Execution Prompt

You are executing a database query optimization experiment.

### Task

Test the hypothesis that adding indexes will improve query performance.

### Steps

1. Connect to test database
2. Record baseline execution time for each test query (run 5 times, average)
3. Create indexes on identified columns:
   - Columns in WHERE clauses
   - Columns used in JOIN conditions
   - Columns in GROUP BY/ORDER BY
4. Run same queries again (5 times, average)
5. Record post-optimization execution time
6. Check for any negative impact on INSERT/UPDATE performance
7. Document all results

### Measurements to Record

- Query execution times (before/after)
- Index creation time
- Storage impact of indexes
- Any changes to query execution plans
- Side effects on other queries

### Important

- Use test database, not production
- Backup before making schema changes
- Document every index created
- Run queries multiple times to account for caching