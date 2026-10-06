import { describe, expect, it, beforeEach } from 'vitest';

class QuestionStub {
  answered = false;
  content: HTMLElement | undefined;
  events: Array<{ name: unknown; data?: unknown }> = [];
  buttons = new Map<string, { callback: () => void; visible: boolean }>();
  feedback: { content: string; score: number; maxScore: number } | undefined;

  constructor(public name: string, public options: unknown) {}

  setContent(content: unknown): this {
    this.content = content as HTMLElement;
    document.body.append(this.content);
    return this;
  }

  addButton(id: string, _label: string, callback: () => void, visible = true): this {
    this.buttons.set(id, { callback, visible });
    return this;
  }

  showButton(id: string): void {
    const button = this.buttons.get(id);
    if (button) {
      button.visible = true;
    }
  }

  hideButton(id: string): void {
    const button = this.buttons.get(id);
    if (button) {
      button.visible = false;
    }
  }

  setFeedback(content: string, score: number, maxScore: number): this {
    this.feedback = { content, score, maxScore };
    return this;
  }

  removeFeedback(): this {
    this.feedback = undefined;
    return this;
  }

  read(): void {}

  trigger(name: unknown, data?: unknown): void {
    this.events.push({ name, data });
  }

  triggerXAPI(name: string): void {
    this.events.push({ name });
  }

  createXAPIEventTemplate(): {
    data: { statement: Record<string, any> };
    getVerifiedStatementValue: (path: string[]) => any;
    setScoredResult: (score: number, max: number, instance: unknown, completion: boolean, success: boolean) => void;
  } {
    const statement: Record<string, any> = { result: {} };
    return {
      data: { statement },
      getVerifiedStatementValue: () => {
        statement.object ??= { definition: {} };
        statement.object.definition ??= {};
        return statement.object.definition;
      },
      setScoredResult: (score, max, _instance, completion, success) => {
        statement.result = { ...statement.result, score: { raw: score, max }, completion, success };
      },
    };
  }
}

describe('H5P.MultiChoice adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (globalThis as any).H5P = {
      Question: QuestionStub,
      jQuery: (value: unknown) => value,
      getPath: (path: string) => path,
      createTitle: (title: string) => title,
    };
  });

  it('keeps the H5P constructor contract while delegating rendering to Lit', async () => {
    await import('../../src/entry');
    const MultiChoice = (globalThis as any).H5P.MultiChoice;
    const instance = new MultiChoice({
      question: '<p>Pick one.</p>',
      answers: [
        { text: 'Yes', correct: true },
        { text: 'No', correct: false },
      ],
      behaviour: { type: 'single', singlePoint: false },
    }, 42, {});

    instance.registerDomElements();
    await instance.view.updateComplete;
    const answers = instance.view.querySelectorAll('.h5p-answer');
    answers[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await instance.view.updateComplete;

    expect(instance.getCurrentState()).toEqual({ answers: [0] });
    expect(instance.getScore()).toBe(1);
    expect(instance.view.querySelector('[aria-checked="true"]')).toBeTruthy();
    expect(instance.buttons.has('check-answer')).toBe(true);
    expect(instance.buttons.has('show-solution')).toBe(true);
    expect(instance.buttons.has('try-again')).toBe(true);
    expect(instance.view.querySelector('.h5p-multichoice-actions')).toBeNull();

    instance.buttons.get('check-answer')?.callback();
    await instance.view.updateComplete;

    expect(instance.feedback?.score).toBe(1);
    expect(instance.feedback?.maxScore).toBe(1);
  });
});
