import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  userId?: string;
  isAlive: boolean;
}

export enum MessageType {
  Create = 'Create',
  Join = 'Join',
  Leave = 'Leave',
  Message = 'Message',
  Hint = 'Hint',
  Discussion = 'Discussion',
  Solutions = 'Solutions',
  Submit = 'Submit',
  Finished = 'Finished',
  Failed = 'Failed',
  Action = 'Action',
  Ready = 'Ready',
  Unready = 'Unready',
  StartGame = 'StartGame',
  EndGame = 'EndGame',
  Forfeit = 'Forfeit',
  UpdateUserState = 'UpdateUserState',
}

export enum UserGameState {
  Ready = 'Ready',
  Unready = 'Unready',
  Playing = 'Playing',
  Spectating = 'Spectating',
  Finished = 'Finished',
  Forfeited = 'Forfeited',
}

export interface MessageParams {
  roomId?: string;
  message?: string;
  problem?: Problem;
  userInfo?: UserInfo;
  playerStates?: {
    [userId: string]: UserGameState;
  };
}

export interface Message {
  type: MessageType;
  params?: MessageParams;
  ts: Date;
}

export enum ProblemDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum ProblemTopics {
  Array = 'array',
  HashTable = 'hash-table',
  LinkedList = 'linked-list',
  Math = 'math',
  Recursion = 'recursion',
  String = 'string',
  SlidingWindow = 'sliding-window',
  BinarySearch = 'binary-search',
  DivideAndConquer = 'divide-and-conquer',
  DynamicProgramming = 'dynamic-programming',
  TwoPointers = 'two-pointers',
  Greedy = 'greedy',
  Sorting = 'sorting',
  Backtracking = 'backtracking',
  Stack = 'stack',
  HeapPriorityQueue = 'heap-priority-queue',
  MergeSort = 'merge-sort',
  StringMatching = 'string-matching',
  BitManipulation = 'bit-manipulation',
  Matrix = 'matrix',
  MonotonicStack = 'monotonic-stack',
  Simulation = 'simulation',
  Combinatorics = 'combinatorics',
  Memoization = 'memoization',
  Tree = 'tree',
  DepthFirstSearch = 'depth-first-search',
  BinaryTree = 'binary-tree',
  BinarySearchTree = 'binary-search-tree',
  BreadthFirstSearch = 'breadth-first-search',
  UnionFind = 'union-find',
  Graph = 'graph',
  Trie = 'trie',
  Design = 'design',
  DoublyLinkedList = 'doubly-linked-list',
  Geometry = 'geometry',
  Interactive = 'interactive',
  BucketSort = 'bucket-sort',
  RadixSort = 'radix-sort',
  Counting = 'counting',
  DataStream = 'data-stream',
  Iterator = 'iterator',
  Database = 'database',
  RollingHash = 'rolling-hash',
  HashFunction = 'hash-function',
  Shell = 'shell',
  Enumeration = 'enumeration',
  NumberTheory = 'number-theory',
  TopologicalSort = 'topological-sort',
  PrefixSum = 'prefix-sum',
  QuickSelect = 'quickselect',
  BinaryIndexedTree = 'binary-indexed-tree',
  SegmentTree = 'segment-tree',
  LineSweep = 'line-sweep',
  OrderedSet = 'ordered-set',
  Queue = 'queue',
  MonotonicQueue = 'monotonic-queue',
  CountingSort = 'counting-sort',
  Brainteaser = 'brainteaser',
  GameTheory = 'game-theory',
  EulerianCircuit = 'eulerian-circuit',
  Randomized = 'randomized',
  ReservoirSampling = 'reservoir-sampling',
  ShortestPath = 'shortest-path',
  Bitmask = 'bitmask',
  RejectionSampling = 'rejection-sampling',
  ProbabilityAndStatistics = 'probability-and-statistics',
  SuffixArray = 'suffix-array',
  Concurrency = 'concurrency',
  MinimumSpanningTree = 'minimum-spanning-tree',
  BiconnectedComponent = 'biconnected-component',
  StronglyConnectedComponent = 'strongly-connected-component',
}

export interface Problem {
  url: string;
  id: number;
  difficulty: ProblemDifficulty;
  name: string;
  premium: boolean;
  topics: string[];
}

export interface Round {
  problem: Problem;
  expiryDate: Date;
  finishedOrder: WebSocket[];
  forfeited: WebSocket[];
  timeoutId: NodeJS.Timeout;
}

export interface Room {
  id: string;
  sockets: {
    [userId: string]: WebSocket;
  };
  completedProblems: Set<Problem>;
  socketGameState: {
    [userId: string]: UserGameState;
  };
  isInGame: boolean;
  round?: Round;
}

export interface Rooms {
  [id: string]: Room;
}

export interface UserToRoom {
  [id: string]: string | undefined;
}

export interface UserInfo {
  userId?: string;
  avatarUrl?: string | null;
}

// if a given param is not passed (eg. difficulty), it is assumed that all are included
export interface ProblemFilter {
  difficulty?: ProblemDifficulty[];
  allowPremium?: boolean;
  topics?: ProblemTopics[];
}
