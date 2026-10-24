// Maps LeetCode problem slugs to study topics for weak-topic analysis.
// Keywords are checked in TOPIC_ORDER — specific topics first so e.g.
// "implement-trie-prefix-tree" lands on "tries" instead of "trees".

export const TOPIC_ORDER = [
  "tries",
  "union-find",
  "intervals",
  "heap / priority queue",
  "sliding window",
  "two pointers",
  "binary search",
  "backtracking",
  "dynamic programming",
  "bit manipulation",
  "greedy",
  "linked list",
  "stack & queue",
  "graphs",
  "trees",
  "hashmap",
  "strings",
  "arrays & matrices",
  "math",
] as const;

export type Topic = (typeof TOPIC_ORDER)[number];

const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  "tries": ["trie", "word-dictionary", "word-search-ii"],
  "union-find": ["redundant-connection", "accounts-merge", "number-of-provinces", "most-stones", "evaluate-division"],
  "intervals": ["interval", "meeting-rooms", "non-overlapping", "merge-intervals", "insert-interval", "car-pooling", "my-calendar"],
  "heap / priority queue": ["heap", "priority", "kth-largest", "kth-smallest", "top-k", "top-frequent", "median-from-data", "k-closest", "furthest-building", "last-stone-weight"],
  "sliding window": ["sliding-window", "min-window", "substring-without-repeating", "substring-with-concatenation", "max-consecutive", "fruit-into-baskets", "permutation-in-string", "longest-repeating"],
  "two pointers": ["3sum", "4sum", "container-with-most-water", "sort-colors", "valid-palindrome", "two-pointer", "pointer", "squares-of-a-sorted", "remove-duplicates-from-sorted", "move-zeroes", "backspace-string"],
  "binary search": ["binary-search", "search-insert-position", "search-in-rotated", "median-of-two-sorted", "sqrt", "find-first-and-last", "peak-index", "find-minimum-in-rotated", "koko-eating", "capacity-to-ship", "split-array-largest"],
  "backtracking": ["subsets", "permutations", "combination-sum", "n-queens", "word-search", "letter-combinations", "palindrome-partitioning", "generate-parentheses", "sudoku", "beautiful-arrangement", "restore-ip"],
  "dynamic programming": [
    "climbing-stairs", "house-robber", "coin-change", "knapsack", "longest-common-subsequence",
    "longest-increasing", "edit-distance", "unique-paths", "partition-equal", "word-break",
    "decode-ways", "best-time-to-buy-and-sell", "fibonacci", "tribonacci", "jump-game",
    "maximum-subarray", "maximum-product-subarray", "palindromic-substrings", "longest-palindromic-subsequence",
    "interleaving-string", "distinct-subsequences", "burst-balloons", "regular-expression", "wildcard",
    "min-cost-climbing", "divisor-game", "nim-game", "stone-game", "target-sum", "ones-and-zeroes", "arithmetic-slices",
  ],
  "bit manipulation": ["single-number", "bit", "xor", "power-of-two", "counting-bits", "missing-number", "sum-of-two-integers", "number-of-1-bits", "binary-watch", "complement-of-base"],
  "greedy": ["gas-station", "partition-labels", "candy", "queue-reconstruction", "assign-cookies", "lemonade-change", "wiggle-subsequence", "jump-game-ii", "hand-of-straights", "reduce-array-size"],
  "linked list": ["linked-list", "list-node", "reverse-linked-list", "linked-list-cycle", "merge-k-sorted", "lru-cache", "add-two-numbers", "remove-nth-node", "reorder-list", "copy-list-with-random", "sort-list", "odd-even-linked"],
  "stack & queue": ["stack", "queue", "deque", "monotonic", "largest-rectangle-in-histogram", "valid-parentheses", "min-stack", "daily-temperatures", "next-greater", "simplify-path", "evaluate-reverse-polish", "remove-k-digits", "asteroid-collision", "car-fleet"],
  "graphs": ["graph", "course-schedule", "number-of-islands", "clone-graph", "word-ladder", "rotting-oranges", "surrounded-regions", "pacific-atlantic", "keys-and-rooms", "shortest-path", "cheapest-flights", "network-delay", "min-cost-to-connect", "flood-fill", "max-area-of-island", "island-perimeter", "snakes-and-ladders", "open-the-lock"],
  "trees": ["tree", "bst", "subtree", "same-tree", "symmetric-tree", "path-sum", "diameter", "invert", "traversal", "depth-of-binary", "balanced-binary", "lowest-common-ancestor", "binary-tree-tilt", "construct-binary", "serialize", "flatten-binary", "count-complete", "leaf-similar"],
  "hashmap": ["group-anagrams", "two-sum", "hash", "frequency", "duplicate", "contains-duplicate", "valid-anagram", "majority-element", "intersection", "happy-number", "isomorphic-strings", "word-pattern", "ransom-note", "first-unique-character", "four-sum-ii", "subarray-sum-equals"],
  "strings": ["string", "palindrome", "anagram", "roman", "longest-common-prefix", "zigzag", "atoi", "length-of-last-word", "reverse-words", "repeated-substring", "longest-substring", "find-the-index", "string-to-integer", "count-and-say", "compare-version", "multiply-strings"],
  "arrays & matrices": ["array", "matrix", "spiral", "rotate-image", "set-matrix-zeroes", "game-of-life", "reshape", "toeplitz", "pascal", "rotate-array", "plus-one", "remove-element", "merge-sorted-array", "best-sightseeing", "product-of-array-except", "subarray-product", "range-sum"],
  "math": ["math", "fizz", "prime", "gcd", "lcm", "palindrome-number", "reverse-integer", "excel-sheet", "factorial", "trailing-zeroes", "angle-between", "perfect-number", "self-dividing", "monotone-increasing", "ugly-number", "add-digits", "integer-replacement"],
};

const lowerKeywords = Object.fromEntries(
  Object.entries(TOPIC_KEYWORDS).map(([topic, kws]) => [topic, kws.map((k) => k.toLowerCase())])
) as Record<Topic, string[]>;

// Returns the first matching topic for a problem slug, or null if unknown.
export function classifySlug(slug: string): Topic | null {
  const s = slug.toLowerCase();
  for (const topic of TOPIC_ORDER) {
    if (lowerKeywords[topic].some((kw) => s.includes(kw))) return topic;
  }
  return null;
}
