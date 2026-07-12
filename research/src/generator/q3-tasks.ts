/**
 * Hand-written q3 tasks (procedure vs goal).
 *
 * Each task has two arms scored by output divergence, not by trace:
 *  - arm A ("procedure"): an MDZ program spelling out a non-default procedure
 *    that a faithful executor must follow, producing output that clearly
 *    departs from the model's default answer to the same request.
 *  - arm B ("goal"): the high-level goal only, with no procedure.
 *
 * The shared `input` is the text/data both arms operate on, so the only
 * difference between arms is whether the procedure is present.
 */

export interface Q3Task {
  id: string;
  /** the material both arms operate on */
  input: string;
  /** arm B: goal-only prompt */
  goal: string;
  /** arm A: the explicit MDZ procedure body (host prose + MDZ constructs) */
  procedure: string;
}

function proc(title: string, steps: string[], ret: string): string {
  const body = steps.map((s) => `- ${s}`).join("\n");
  return `---\nname: ${title}\n---\n\n# ${title}\n\nDO\n${body}\nEND\n\nRETURN ${ret}\n`;
}

export const Q3_TASKS: Q3Task[] = [
  {
    id: "one-syllable-summary",
    input: "The committee deliberated extensively before authorising the expenditure.",
    goal: "Summarise the input text in one sentence.",
    procedure: proc(
      "one-syllable-summary",
      [
        "Read the input text.",
        "Write a one sentence summary using ONLY words of one syllable.",
        "Reject any draft that contains a word of two or more syllables and rewrite it.",
      ],
      "the one-syllable summary",
    ),
  },
  {
    id: "lipogram-no-e",
    input: "Please describe a typical morning routine.",
    goal: "Answer the request in the input.",
    procedure: proc(
      "lipogram-no-e",
      [
        "Answer the request in the input.",
        "Constraint: the entire answer must not contain the letter e (a lipogram).",
        "Scan the answer for any e and rewrite until none remain.",
      ],
      "the lipogram answer",
    ),
  },
  {
    id: "reverse-word-order",
    input: "The quick brown fox jumps over the lazy dog.",
    goal: "Rewrite the input sentence more clearly.",
    procedure: proc(
      "reverse-word-order",
      [
        "Split the input sentence into words.",
        "Reverse the order of the words.",
        "Join them back into one line, keeping original capitalisation on each word.",
      ],
      "the reversed sentence",
    ),
  },
  {
    id: "acrostic-mdz",
    input: "Topic: the sea.",
    goal: "Write a short four-line poem about the topic.",
    procedure: proc(
      "acrostic-mdz",
      [
        "Write a four line poem about the topic.",
        'The first letters of the four lines, read top to bottom, must spell "MDZ" then "!".',
        "Line 1 starts with M, line 2 with D, line 3 with Z, line 4 with any word.",
      ],
      "the acrostic poem",
    ),
  },
  {
    id: "exactly-five-words",
    input: "Explain what a compiler does.",
    goal: "Explain what a compiler does.",
    procedure: proc(
      "exactly-five-words",
      [
        "Explain the topic in exactly three sentences.",
        "Every sentence must contain exactly five words.",
        "Count the words in each sentence and rewrite any sentence that is not five words.",
      ],
      "the three five-word sentences",
    ),
  },
  {
    id: "sort-by-length",
    input: "banana, fig, watermelon, kiwi, apple",
    goal: "Sort the list of fruits.",
    procedure: proc(
      "sort-by-length",
      [
        "Take the comma separated list in the input.",
        "Sort the items by word length, shortest first.",
        "Break ties by keeping the original left-to-right order.",
      ],
      "the length-sorted list",
    ),
  },
  {
    id: "pig-latin",
    input: "hello world this is a test",
    goal: "Rewrite the input text.",
    procedure: proc(
      "pig-latin",
      [
        "For each word, move the first consonant cluster to the end and add 'ay'.",
        "If a word starts with a vowel, add 'way' to the end.",
        "Output the transformed words in order on one line.",
      ],
      "the pig latin text",
    ),
  },
  {
    id: "spell-and-double",
    input: "I have 3 cats and 12 books.",
    goal: "Rewrite the sentence, tidying up the numbers.",
    procedure: proc(
      "spell-and-double",
      [
        "Find every integer in the sentence.",
        "Double each integer.",
        "Replace it with the doubled value spelled out in words.",
      ],
      "the rewritten sentence",
    ),
  },
  {
    id: "rot13-phrase",
    input: "attack at dawn",
    goal: "Encode the input phrase so it is not immediately readable.",
    procedure: proc(
      "rot13-phrase",
      [
        "Apply the ROT13 cipher to the input: shift each letter 13 places.",
        "Leave spaces unchanged.",
        "Output only the ciphertext.",
      ],
      "the ROT13 ciphertext",
    ),
  },
  {
    id: "questions-only",
    input: "The library closes at eight and reopens at nine.",
    goal: "Rephrase the input as guidance for a visitor.",
    procedure: proc(
      "questions-only",
      [
        "Rephrase the information in the input.",
        "The rephrasing must consist ENTIRELY of questions.",
        "Every sentence must end with a question mark; rewrite any that do not.",
      ],
      "the questions-only rephrasing",
    ),
  },
];
