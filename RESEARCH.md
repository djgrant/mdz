# Research

Today's SOTA models (July 2026) can complete high-level goals by creating and orchestrating their own plans. Performance is exceptional in domains like coding, where the models can verify their work. There are however three situations where goal-driven orchestration may be insufficient: a) where the criteria is to follow a process, not to achieve a goal (think: compliance); b) where more valuable results can be achieved by pushing the model to the edges of its training distribution; c) where you want to utilise a cheap/local model. 

## Questions

**Process > goal**

1. Which features of notation change the error rate – keywords, delimiters, indentation, type annotations (enforced, coerced, or ignored), malformed programs (halt, repair, or improvise)?
2. At what program size does execution break down, and which dimension drives it – statement count, nesting depth, or loop iterations?

**Explore out-of-distribution spaces**

3. Does a faithfully executed procedure produce outputs that diverge from the goal-prompted baseline, or does the model converge on its defaults regardless?
4. Do parameters bind faithfully across skill and agent boundaries, and does error compound with call depth?

**Expand use cases of local models**

5. Does externalising program state – tracked by a tool, or written directly into the KV cache – extend the executable program size at a fixed error rate, and at what token cost?

## What answering these yields

Answers to 1 and 2 give prompt authors a concrete rule: below this size, in this notation, a procedure can live in the prompt; beyond it, the logic moves into the harness. The same data either confirms MDZ's design decisions or specifies the corrections. An answer to 3 tells us whether procedures change what the model produces, or merely relabel what it would have done anyway – the difference between a steering mechanism and decoration. An answer to 4 sets the depth to which skills can be composed. And if 5 shows that external state lets a small model execute what today needs a frontier model, the same work runs at a fraction of the cost, on hardware you own.

## Method

We will answer these questions by giving models programs to execute, and scoring their execution against known, correct traces. A generator will produce random MDZ programs with size and notation as parameters – flat programs for questions 1 to 3, module trees for 4. Because MDZ can be parsed, a reference interpreter will compute each program's correct trace, and the model's execution will be scored against it. Question 3 will compare against a harness running with the goal command. Question 5 will run on local weights, where program state can be written into the KV cache directly.
