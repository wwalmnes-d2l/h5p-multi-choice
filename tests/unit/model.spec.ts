import { describe, expect, it } from 'vitest';
import { MultiChoiceModel } from '../../src/domain/model';

const options = {
  question: '<p>Pick the colours.</p>',
  answers: [
    { text: 'Red', correct: true },
    { text: 'Green', correct: false },
    { text: 'Blue', correct: true },
  ],
  behaviour: {
    type: 'multi' as const,
    singlePoint: false,
    randomAnswers: false,
  },
};

describe('MultiChoiceModel', () => {
  it('scores weighted multi-answer selections and clamps incorrect selections', () => {
    const model = new MultiChoiceModel(options, {}, 'question-1');

    expect(model.maxScore).toBe(2);
    model.select(0);
    model.select(1);
    expect(model.score).toBe(0);
    model.select(1);
    model.select(2);
    expect(model.score).toBe(2);
  });

  it('restores and serializes original answer indexes when answers are shuffled', () => {
    const model = new MultiChoiceModel({
      ...options,
      behaviour: { ...options.behaviour, randomAnswers: true },
    }, { previousState: { answers: [0, 2] } }, 'question-2');

    expect(model.getCurrentState().answers.sort((a, b) => a - b)).toEqual([0, 2]);
    expect(model.selectedIndices).toHaveLength(2);
  });

  it('supports blank-is-correct tasks', () => {
    const model = new MultiChoiceModel({
      answers: [{ text: 'Not correct', correct: false }],
      behaviour: { type: 'multi' as const, singlePoint: false },
      weight: 3,
    }, {}, 'question-3');

    expect(model.maxScore).toBe(3);
    expect(model.score).toBe(3);
    expect(model.answerGiven).toBe(true);
  });

  it('disables input after checking and exposes solution state', () => {
    const model = new MultiChoiceModel(options, {}, 'question-4');
    model.select(0);
    model.check();

    expect(model.isChecked).toBe(true);
    expect(model.inputDisabled).toBe(true);
    expect(model.getViewState().answers[0].correct).toBe(true);

    model.reset();
    model.showSolutions();
    expect(model.getViewState().answers[0].shouldCheck).toBe(true);
    expect(model.getViewState().answers[1].shouldNotCheck).toBe(true);
  });
});
