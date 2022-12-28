import { PROBLEMS } from './problems';
import { Problem, ProblemFilter, Room } from './types';

const intersection = <T>(a: Set<T>, b: Set<T>): Array<T> =>
  [...a].filter((x) => b.has(x));

const difference = <T>(a: Set<T>, b: Set<T>): Array<T> =>
  [...a].filter((x) => !b.has(x));

const getRandomFromList = <T>(arr: Array<T>): T =>
  arr[Math.floor(Math.random() * arr.length)];

const isProblemWithinFilter = (
  filter: ProblemFilter,
  problem: Problem
): boolean => {
  if (!filter?.allowPremium && problem.premium) return false;

  if (filter.difficulty?.includes(problem.difficulty) === false) return false;

  if (
    filter.topics?.length !== undefined &&
    intersection(new Set(filter.topics), new Set(problem.topics)).length === 0
  )
    return false;

  return true;
};

// creates a list of still available problems based on room,
// and then picks a random problem from that
export const getRandomProblem = (room: Room): Problem | undefined => {
  const availableProblems = difference(
    new Set(PROBLEMS),
    new Set(room.completedProblems)
  );
  if (availableProblems.length === 0) return undefined;

  return getRandomFromList(availableProblems);
};

// filters original list of problems, then creates a list of still available
// problems based on room, and then picks a random problem from that
export const getRandomProblemWithFilter = (
  room: Room,
  filter: ProblemFilter
): Problem | undefined => {
  const filteredProblems = PROBLEMS.filter((problem) =>
    isProblemWithinFilter(filter, problem)
  );
  const availableProblems = difference(
    new Set(filteredProblems),
    new Set(room.completedProblems)
  );
  if (availableProblems.length === 0) return undefined;

  return getRandomFromList(availableProblems);
};
