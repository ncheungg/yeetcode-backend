import { PROBLEMS } from './problems';
import { Problem } from './types';

export const getRandomProblem = (): Problem =>
  PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
