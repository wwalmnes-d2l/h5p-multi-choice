import type { Answer } from './types';

export function calculateMaxScore(
  answers: Answer[],
  weight: number,
  blankIsCorrect: boolean,
): number {
  if (blankIsCorrect) {
    return weight;
  }

  return answers.reduce(
    (total, answer) => total + (answer.correct ? answer.weight ?? 1 : 0),
    0,
  );
}

export function calculateScore(
  selected: number[],
  answers: Answer[],
  options: {
    weight: number;
    blankIsCorrect: boolean;
    singleAnswer: boolean;
    singlePoint: boolean;
    passPercentage: number;
  },
): number {
  if (options.singleAnswer) {
    const answer = selected.length ? answers[selected[0]] : undefined;
    return answer?.correct ? options.weight : 0;
  }

  let score = selected.reduce((total, index) => {
    const answer = answers[index];
    if (!answer) {
      return total;
    }
    const answerWeight = answer.weight ?? 1;
    return total + (answer.correct ? answerWeight : -answerWeight);
  }, 0);

  score = Math.max(score, 0);
  if (selected.length === 0 && options.blankIsCorrect) {
    score = options.weight;
  }

  if (options.singlePoint) {
    const max = calculateMaxScore(answers, options.weight, options.blankIsCorrect);
    score = max > 0 && (100 * score) / max >= options.passPercentage
      ? options.weight
      : 0;
  }

  return score;
}
