import { NextResponse } from "next/server";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

// Correct LeetCode GraphQL query (uses questionList + questionFrontendId + isPaidOnly)
const EASY_QUERY = `
  query questionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      totalNum
      data {
        questionFrontendId
        titleSlug
        title
        difficulty
        topicTags { name }
        acRate
        isPaidOnly
      }
    }
  }
`;

// 60 popular free Easy problems as reliable fallback
const FALLBACK_EASY: { id: string; slug: string; title: string; tags: string[] }[] = [
  { id: "1",   slug: "two-sum",                            title: "Two Sum",                            tags: ["Array","Hash Table"] },
  { id: "9",   slug: "palindrome-number",                  title: "Palindrome Number",                  tags: ["Math"] },
  { id: "13",  slug: "roman-to-integer",                   title: "Roman to Integer",                   tags: ["Math","String"] },
  { id: "14",  slug: "longest-common-prefix",              title: "Longest Common Prefix",              tags: ["String"] },
  { id: "20",  slug: "valid-parentheses",                  title: "Valid Parentheses",                  tags: ["String","Stack"] },
  { id: "21",  slug: "merge-two-sorted-lists",             title: "Merge Two Sorted Lists",             tags: ["Linked List","Recursion"] },
  { id: "26",  slug: "remove-duplicates-from-sorted-array",title: "Remove Duplicates from Sorted Array",tags: ["Array","Two Pointers"] },
  { id: "27",  slug: "remove-element",                     title: "Remove Element",                     tags: ["Array","Two Pointers"] },
  { id: "28",  slug: "find-the-index-of-the-first-occurrence-in-a-string", title: "Find the Index of the First Occurrence in a String", tags: ["String","Two Pointers"] },
  { id: "35",  slug: "search-insert-position",             title: "Search Insert Position",             tags: ["Array","Binary Search"] },
  { id: "58",  slug: "length-of-last-word",                title: "Length of Last Word",                tags: ["String"] },
  { id: "66",  slug: "plus-one",                           title: "Plus One",                           tags: ["Array","Math"] },
  { id: "67",  slug: "add-binary",                         title: "Add Binary",                         tags: ["Math","String","Bit Manipulation"] },
  { id: "69",  slug: "sqrtx",                              title: "Sqrt(x)",                            tags: ["Math","Binary Search"] },
  { id: "70",  slug: "climbing-stairs",                    title: "Climbing Stairs",                    tags: ["Math","DP","Memoization"] },
  { id: "83",  slug: "remove-duplicates-from-sorted-list", title: "Remove Duplicates from Sorted List", tags: ["Linked List"] },
  { id: "88",  slug: "merge-sorted-array",                 title: "Merge Sorted Array",                 tags: ["Array","Two Pointers","Sorting"] },
  { id: "94",  slug: "binary-tree-inorder-traversal",      title: "Binary Tree Inorder Traversal",      tags: ["Tree","DFS","Binary Tree"] },
  { id: "100", slug: "same-tree",                          title: "Same Tree",                          tags: ["Tree","DFS","BFS","Binary Tree"] },
  { id: "101", slug: "symmetric-tree",                     title: "Symmetric Tree",                     tags: ["Tree","DFS","BFS","Binary Tree"] },
  { id: "104", slug: "maximum-depth-of-binary-tree",       title: "Maximum Depth of Binary Tree",       tags: ["Tree","DFS","BFS","Binary Tree"] },
  { id: "108", slug: "convert-sorted-array-to-binary-search-tree", title: "Convert Sorted Array to BST", tags: ["Array","Divide & Conquer","Tree"] },
  { id: "110", slug: "balanced-binary-tree",               title: "Balanced Binary Tree",               tags: ["Tree","DFS","Binary Tree"] },
  { id: "111", slug: "minimum-depth-of-binary-tree",       title: "Minimum Depth of Binary Tree",       tags: ["Tree","DFS","BFS","Binary Tree"] },
  { id: "112", slug: "path-sum",                           title: "Path Sum",                           tags: ["Tree","DFS","Binary Tree"] },
  { id: "118", slug: "pascals-triangle",                   title: "Pascal's Triangle",                  tags: ["Array","DP"] },
  { id: "119", slug: "pascals-triangle-ii",                title: "Pascal's Triangle II",               tags: ["Array","DP"] },
  { id: "121", slug: "best-time-to-buy-and-sell-stock",    title: "Best Time to Buy and Sell Stock",    tags: ["Array","DP"] },
  { id: "125", slug: "valid-palindrome",                   title: "Valid Palindrome",                   tags: ["Two Pointers","String"] },
  { id: "136", slug: "single-number",                      title: "Single Number",                      tags: ["Array","Bit Manipulation"] },
  { id: "141", slug: "linked-list-cycle",                  title: "Linked List Cycle",                  tags: ["Hash Table","Linked List","Two Pointers"] },
  { id: "155", slug: "min-stack",                          title: "Min Stack",                          tags: ["Stack","Design"] },
  { id: "160", slug: "intersection-of-two-linked-lists",   title: "Intersection of Two Linked Lists",   tags: ["Hash Table","Linked List","Two Pointers"] },
  { id: "168", slug: "excel-sheet-column-title",           title: "Excel Sheet Column Title",           tags: ["Math","String"] },
  { id: "169", slug: "majority-element",                   title: "Majority Element",                   tags: ["Array","Hash Table","Sorting","Counting"] },
  { id: "171", slug: "excel-sheet-column-number",          title: "Excel Sheet Column Number",          tags: ["Math","String"] },
  { id: "190", slug: "reverse-bits",                       title: "Reverse Bits",                       tags: ["Divide & Conquer","Bit Manipulation"] },
  { id: "191", slug: "number-of-1-bits",                   title: "Number of 1 Bits",                   tags: ["Divide & Conquer","Bit Manipulation"] },
  { id: "202", slug: "happy-number",                       title: "Happy Number",                       tags: ["Hash Table","Math","Two Pointers"] },
  { id: "203", slug: "remove-linked-list-elements",        title: "Remove Linked List Elements",        tags: ["Linked List","Recursion"] },
  { id: "205", slug: "isomorphic-strings",                 title: "Isomorphic Strings",                 tags: ["Hash Table","String"] },
  { id: "206", slug: "reverse-linked-list",                title: "Reverse Linked List",                tags: ["Linked List","Recursion"] },
  { id: "217", slug: "contains-duplicate",                 title: "Contains Duplicate",                 tags: ["Array","Hash Table","Sorting"] },
  { id: "219", slug: "contains-duplicate-ii",              title: "Contains Duplicate II",              tags: ["Array","Hash Table","Sliding Window"] },
  { id: "226", slug: "invert-binary-tree",                 title: "Invert Binary Tree",                 tags: ["Tree","DFS","BFS","Binary Tree"] },
  { id: "228", slug: "summary-ranges",                     title: "Summary Ranges",                     tags: ["Array"] },
  { id: "231", slug: "power-of-two",                       title: "Power of Two",                       tags: ["Math","Bit Manipulation","Recursion"] },
  { id: "232", slug: "implement-queue-using-stacks",        title: "Implement Queue Using Stacks",        tags: ["Stack","Design","Queue"] },
  { id: "234", slug: "palindrome-linked-list",             title: "Palindrome Linked List",             tags: ["Linked List","Two Pointers","Stack","Recursion"] },
  { id: "235", slug: "lowest-common-ancestor-of-a-binary-search-tree", title: "LCA of BST", tags: ["Tree","DFS","Binary Search Tree"] },
  { id: "242", slug: "valid-anagram",                      title: "Valid Anagram",                      tags: ["Hash Table","String","Sorting"] },
  { id: "257", slug: "binary-tree-paths",                  title: "Binary Tree Paths",                  tags: ["String","Backtracking","Tree","DFS"] },
  { id: "258", slug: "add-digits",                         title: "Add Digits",                         tags: ["Math","Number Theory","Simulation"] },
  { id: "263", slug: "ugly-number",                        title: "Ugly Number",                        tags: ["Math"] },
  { id: "268", slug: "missing-number",                     title: "Missing Number",                     tags: ["Array","Hash Table","Math","Bit Manipulation","Sorting"] },
  { id: "278", slug: "first-bad-version",                  title: "First Bad Version",                  tags: ["Binary Search","Interactive"] },
  { id: "283", slug: "move-zeroes",                        title: "Move Zeroes",                        tags: ["Array","Two Pointers"] },
  { id: "290", slug: "word-pattern",                       title: "Word Pattern",                       tags: ["Hash Table","String"] },
  { id: "292", slug: "nim-game",                           title: "Nim Game",                           tags: ["Math","Game Theory","Brainteaser"] },
  { id: "303", slug: "range-sum-query-immutable",          title: "Range Sum Query - Immutable",        tags: ["Array","Design","Prefix Sum"] },
  { id: "326", slug: "power-of-three",                     title: "Power of Three",                     tags: ["Math","Recursion"] },
];

// Seeded random (mulberry32)
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayUTC(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}

function dateSeed(date: string) {
  return parseInt(date.replace(/-/g, ""), 10);
}

let cache: { data: unknown; dateKey: string } | null = null;

export async function GET() {
  const dateKey = todayUTC();

  if (cache?.dateKey === dateKey) return NextResponse.json(cache.data);

  try {
    // Try LeetCode API first
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://leetcode.com",
        Origin: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: EASY_QUERY,
        variables: { categorySlug: "", skip: 0, limit: 50, filters: { difficulty: "EASY" } },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      const questions: any[] = json?.data?.questionList?.data ?? [];
      const free = questions.filter((q) => !q.isPaidOnly && q.difficulty === "Easy");

      if (free.length > 0) {
        const rand = seededRandom(dateSeed(dateKey));
        const q = free[Math.floor(rand() * free.length)];
        const payload = {
          date: dateKey,
          questionId: q.questionFrontendId,
          titleSlug: q.titleSlug,
          title: q.title,
          difficulty: "Easy" as const,
          tags: (q.topicTags || []).map((t: { name: string }) => t.name),
          acRate: Math.round(q.acRate),
          leetcodeUrl: `https://leetcode.com/problems/${q.titleSlug}/`,
        };
        cache = { data: payload, dateKey };
        return NextResponse.json(payload);
      }
    }
  } catch (e) {
    console.warn("LeetCode API unavailable, using fallback:", e);
  }

  // Fallback: pick from curated list using today's seed
  const rand = seededRandom(dateSeed(dateKey));
  const f = FALLBACK_EASY[Math.floor(rand() * FALLBACK_EASY.length)];
  const payload = {
    date: dateKey,
    questionId: f.id,
    titleSlug: f.slug,
    title: f.title,
    difficulty: "Easy" as const,
    tags: f.tags,
    acRate: 55,
    leetcodeUrl: `https://leetcode.com/problems/${f.slug}/`,
  };
  cache = { data: payload, dateKey };
  return NextResponse.json(payload);
}
