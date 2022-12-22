import { Problem, ProblemDifficulty } from './types';

const PROBLEMS: Problem[] = [
  {
    url: 'https://leetcode.com/problems/two-sum/',
    id: 1,
    difficulty: ProblemDifficulty.Easy,
    name: 'Two Sum',
  },
];

export const getRandomProblem = (): Problem =>
  PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
