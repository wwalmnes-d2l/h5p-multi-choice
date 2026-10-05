import { describe, expect, it } from 'vitest';
import { MultiChoiceModel } from '../../src/domain/model';
import { defineMultiChoiceElement, MultiChoiceView } from '../../src/components/multichoice-view';

describe('MultiChoiceView', () => {
  beforeEach(() => {
    defineMultiChoiceElement();
  });

  it('renders answer semantics and handles keyboard selection', async () => {
    const model = new MultiChoiceModel({
      question: '<p>Choose one.</p>',
      answers: [
        { text: 'Correct', correct: true },
        { text: 'Wrong', correct: false },
      ],
      behaviour: { type: 'single', singlePoint: false },
    }, {}, 'question-view');
    const view = document.createElement('h5p-multichoice') as MultiChoiceView;
    view.model = model;
    document.body.append(view);
    await view.updateComplete;
    const answers = view.querySelectorAll<HTMLElement>('.h5p-answer');
    expect(answers).toHaveLength(2);
    expect(view.querySelector('.h5p-answers')?.getAttribute('role')).toBe('radiogroup');
    expect(answers[0].getAttribute('aria-checked')).toBe('false');

    answers[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await view.updateComplete;

    expect(answers[0].getAttribute('aria-checked')).toBe('true');
    expect(answers[1].getAttribute('aria-checked')).toBe('false');
  });

  it('renders configured tips and opens them without selecting the answer', async () => {
    const model = new MultiChoiceModel({
      answers: [{ text: 'Answer', correct: true, tipsAndFeedback: { tip: '<p>Hint</p>' } }],
      behaviour: { type: 'single' },
    }, {}, 'question-tip');
    const view = document.createElement('h5p-multichoice') as MultiChoiceView;
    view.model = model;
    document.body.append(view);
    await view.updateComplete;

    const tip = view.querySelector<HTMLButtonElement>('.multichoice-tip');
    expect(tip).toBeTruthy();
    tip?.click();
    await view.updateComplete;

    expect(view.querySelector('.h5p-feedback-text')?.textContent).toContain('Hint');
    expect(model.selectedIndices).toEqual([]);
  });
});
