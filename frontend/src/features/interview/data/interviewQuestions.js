/**
 * Sample interview questions for Interview Mode.
 *
 * Categories: Algorithms, Data Structures, JavaScript, React, System Design,
 *             Frontend, Programming Fundamentals
 *
 * Keep this dataset small and extensible — it can be replaced by backend data later.
 */

export const interviewQuestions = [
  {
    id: 1,
    title: 'First Non-Repeating Character',
    description:
      'Write a function that takes a string and returns the first character that does not repeat anywhere in the string.\n\nExample:\n  Input: "aabbcdd"\n  Output: "c"\n\nIf every character repeats, return null.',
    difficulty: 'Easy',
    category: 'Algorithms',
    starterCode: `function firstNonRepeatingChar(str) {\n  // Your code here\n}`,
  },
  {
    id: 2,
    title: 'Reverse a Linked List',
    description:
      'Given the head of a singly linked list, reverse the list and return the new head.\n\nEach node has a .val and .next property.\n\nExample:\n  Input:  1 → 2 → 3 → 4 → null\n  Output: 4 → 3 → 2 → 1 → null',
    difficulty: 'Medium',
    category: 'Data Structures',
    starterCode: `function reverseList(head) {\n  // Your code here\n}`,
  },
  {
    id: 3,
    title: 'Debounce Function',
    description:
      'Implement a debounce function that delays invoking the provided function until after a given number of milliseconds have elapsed since the last time it was called.\n\nThe returned function should also have a .cancel() method.',
    difficulty: 'Medium',
    category: 'JavaScript',
    starterCode: `function debounce(func, delay) {\n  // Your code here\n}`,
  },
  {
    id: 4,
    title: 'useLocalStorage Hook',
    description:
      'Create a custom React hook called useLocalStorage that works like useState but persists the value in localStorage.\n\nSignature: useLocalStorage(key, initialValue)\n\nReturn [storedValue, setValue].\n\nHandle JSON serialization and deserialization.',
    difficulty: 'Medium',
    category: 'React',
    starterCode: `function useLocalStorage(key, initialValue) {\n  // Your code here\n}`,
  },
  {
    id: 5,
    title: 'Two Sum',
    description:
      'Given an array of integers and a target sum, return the indices of the two numbers that add up to the target.\n\nAssume exactly one solution exists and you may not use the same element twice.\n\nExample:\n  Input: nums = [2, 7, 11, 15], target = 9\n  Output: [0, 1]',
    difficulty: 'Easy',
    category: 'Algorithms',
    starterCode: `function twoSum(nums, target) {\n  // Your code here\n}`,
  },
  {
    id: 6,
    title: 'Design a URL Shortener',
    description:
      'Design a URL shortening service (like bit.ly).\n\nDiscuss:\n• How would you generate unique short URLs?\n• What database schema would you use?\n• How would you handle high read traffic?\n• How would you handle link expiration?\n• What are the trade-offs between different encoding strategies?',
    difficulty: 'Hard',
    category: 'System Design',
    starterCode: `// Outline your design approach here\n// Consider: API endpoints, database schema, encoding strategy`,
  },
  {
    id: 7,
    title: 'Flatten a Nested Array',
    description:
      'Write a function that takes a deeply nested array and returns a new flat array with all values.\n\nDo not use Array.prototype.flat().\n\nExample:\n  Input: [1, [2, [3, [4]], 5]]\n  Output: [1, 2, 3, 4, 5]',
    difficulty: 'Easy',
    category: 'JavaScript',
    starterCode: `function flatten(arr) {\n  // Your code here\n}`,
  },
  {
    id: 8,
    title: 'Binary Search Tree Validation',
    description:
      'Given the root of a binary tree, determine if it is a valid Binary Search Tree (BST).\n\nA valid BST is defined as:\n• The left subtree only contains nodes with keys less than the node\'s key.\n• The right subtree only contains nodes with keys greater than the node\'s key.\n• Both left and right subtrees must also be valid BSTs.',
    difficulty: 'Medium',
    category: 'Data Structures',
    starterCode: `function isValidBST(root) {\n  // Your code here\n}`,
  },
  {
    id: 9,
    title: 'Responsive CSS Layout',
    description:
      'Describe how you would build a responsive dashboard layout with:\n• A fixed sidebar (collapsible on mobile)\n• A top navigation bar\n• A main content area with a card grid\n• A footer\n\nDiscuss your CSS approach: Flexbox vs Grid, breakpoints, and mobile-first strategy.',
    difficulty: 'Easy',
    category: 'Frontend',
    starterCode: `/* Describe your CSS layout strategy */\n/* Consider: media queries, flexbox/grid, mobile-first */`,
  },
  {
    id: 10,
    title: 'Promise.all Implementation',
    description:
      'Implement your own version of Promise.all().\n\nThe function should:\n• Accept an array of promises\n• Return a single promise that resolves to an array of results\n• Reject immediately if any promise rejects\n• Maintain the order of results matching the input order',
    difficulty: 'Hard',
    category: 'Programming Fundamentals',
    starterCode: `function promiseAll(promises) {\n  // Your code here\n}`,
  },
];
