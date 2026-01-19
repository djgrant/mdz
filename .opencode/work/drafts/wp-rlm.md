---
name: rolling-summarizer
description: Summarize a massive document without context rot
input:
  # Parent sees: "[FILE POINTER]"
  # Child sees: "It was the best of times..."
  book: $String @disk
context:
  # Parent sees: "Chapter 1 was about..."
  running_summary: $String = ""
---

## 1. Split without Loading
<!-- logic splits the file pointer into list of file pointers -->
$chunks: $String[] @disk = $/split $book into 10k token segments/

## 2. The RLM Loop
FOR $chunk IN $chunks
  
  <!-- 
    CRITICAL STEP: 
    We pass the @disk pointer ($chunk) to the agent.
    The Runtime loads the actual text into the Reader's context.
  -->
  $insight = AWAIT DELEGATE /summarize new info/ TO ~/agent/reader WITH:
    text: $chunk
    context: $running_summary

  <!-- Update state in Parent Context -->
  $running_summary = $/merge $running_summary + $insight/

END

RETURN $running_summary
