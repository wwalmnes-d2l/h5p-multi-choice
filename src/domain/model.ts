import {
  DEFAULT_BEHAVIOUR,
  DEFAULT_UI,
  type Answer,
  type AnswerState,
  type Behaviour,
  type ContentData,
  type MultiChoiceOptions,
  type UIStrings,
  type ViewState,
} from './types';
import { calculateMaxScore, calculateScore } from './scoring';

const shuffle = <T>(values: T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export class MultiChoiceModel {
  readonly question: string;
  readonly answers: Answer[];
  readonly overallFeedback: NonNullable<MultiChoiceOptions['overallFeedback']>;
  readonly UI: UIStrings;
  readonly behaviour: Behaviour;
  readonly weight: number;
  readonly blankIsCorrect: boolean;
  readonly singleAnswer: boolean;
  readonly labelId: string;
  readonly media: MultiChoiceOptions['media'];
  readonly confirmCheck: MultiChoiceOptions['confirmCheck'];
  readonly confirmRetry: MultiChoiceOptions['confirmRetry'];
  readonly contentData: ContentData;

  private selected = new Set<number>();
  private answered = false;
  private checked = false;
  private solutionsVisible = false;
  private feedbackVisible = false;
  private instantFeedback = false;
  private retryHidden = false;
  private openTip: number | undefined;

  constructor(options: MultiChoiceOptions = {}, contentData: ContentData = {}, labelId: string) {
    this.contentData = contentData;
    this.question = options.question ?? 'No question text provided';
    this.UI = { ...DEFAULT_UI, ...(options.UI ?? {}) };
    this.behaviour = { ...DEFAULT_BEHAVIOUR, ...(options.behaviour ?? {}) };
    this.weight = options.weight ?? 1;
    this.overallFeedback = options.overallFeedback ?? [];
    this.media = options.media;
    this.confirmCheck = options.confirmCheck;
    this.confirmRetry = options.confirmRetry;
    this.labelId = labelId;

    const answers = (options.answers?.length ? options.answers : [{ text: 'Answer 1', correct: true }])
      .map((answer, originalOrder) => ({
        ...structuredClone(answer),
        originalOrder,
        tipsAndFeedback: { ...(answer.tipsAndFeedback ?? {}) },
      }));
    const correctCount = answers.filter((answer) => answer.correct).length;
    this.blankIsCorrect = correctCount === 0;
    this.singleAnswer = this.behaviour.type === 'auto'
      ? correctCount === 1
      : this.behaviour.type === 'single';
    this.answers = this.behaviour.randomAnswers ? shuffle(answers) : answers;

    const previous = contentData.previousState?.answers ?? [];
    previous.forEach((originalIndex) => {
      const displayIndex = this.answers.findIndex((answer) => answer.originalOrder === originalIndex);
      if (displayIndex >= 0) {
        this.selected.add(displayIndex);
      }
    });
  }

  get selectedIndices(): number[] {
    return [...this.selected].sort((a, b) => a - b);
  }

  get score(): number {
    return calculateScore(this.selectedIndices, this.answers, {
      weight: this.weight,
      blankIsCorrect: this.blankIsCorrect,
      singleAnswer: this.singleAnswer,
      singlePoint: this.behaviour.singlePoint,
      passPercentage: this.behaviour.passPercentage,
    });
  }

  get maxScore(): number {
    return !this.singleAnswer && !this.behaviour.singlePoint
      ? calculateMaxScore(this.answers, this.weight, this.blankIsCorrect)
      : this.weight;
  }

  get answerGiven(): boolean {
    return this.answered || this.selected.size > 0 || this.blankIsCorrect;
  }

  select(index: number): void {
    if (this.inputDisabled || !this.answers[index]) {
      return;
    }

    this.answered = true;
    this.hideEvaluationFor(index);
    if (this.singleAnswer) {
      this.selected.clear();
      this.selected.add(index);
    } else if (this.selected.has(index)) {
      if (this.behaviour.autoCheck && !this.behaviour.enableRetry) {
        return;
      }
      this.selected.delete(index);
    } else {
      this.selected.add(index);
    }

    if (this.behaviour.autoCheck) {
      if (this.singleAnswer || this.score === this.maxScore) {
        this.check();
      } else {
        this.instantFeedback = true;
      }
    }
  }

  toggleTip(index: number): void {
    this.openTip = this.openTip === index ? undefined : index;
  }

  check(): void {
    this.answered = true;
    this.checked = true;
    this.instantFeedback = false;
    this.feedbackVisible = true;
    this.openTip = undefined;
  }

  showSolutions(hideRetry = false): void {
    this.solutionsVisible = true;
    this.checked = false;
    this.instantFeedback = false;
    this.retryHidden = hideRetry;
    this.openTip = undefined;
  }

  showCheckSolution(skipFeedback = false): void {
    this.checked = !skipFeedback;
    this.instantFeedback = true;
    this.feedbackVisible = !skipFeedback;
    this.openTip = undefined;
  }

  hideSolutions(): void {
    this.solutionsVisible = false;
    this.checked = false;
    this.feedbackVisible = false;
    this.instantFeedback = false;
    this.openTip = undefined;
  }

  reset(): void {
    this.selected.clear();
    this.answered = false;
    this.checked = false;
    this.solutionsVisible = false;
    this.feedbackVisible = false;
    this.instantFeedback = false;
    this.retryHidden = false;
    this.openTip = undefined;
  }

  retry(): void {
    this.reset();
    if (this.behaviour.randomAnswers) {
      const shuffled = [...this.answers];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      this.answers.splice(0, this.answers.length, ...shuffled);
    }
  }

  get inputDisabled(): boolean {
    return this.checked || this.solutionsVisible;
  }

  get isChecked(): boolean {
    return this.checked;
  }

  get isSolutionsVisible(): boolean {
    return this.solutionsVisible;
  }

  get isFeedbackVisible(): boolean {
    return this.feedbackVisible;
  }

  get feedbackText(): string {
    const ratio = this.maxScore === 0 ? 0 : (100 * this.score) / this.maxScore;
    const match = this.overallFeedback.find((range) => ratio >= range.from && ratio <= range.to);
    return (match?.feedback ?? '').replace('@score', `${this.score}`).replace('@total', `${this.maxScore}`);
  }

  getCurrentState(): { answers: number[] } {
    return {
      answers: this.selectedIndices.map((index) => this.answers[index].originalOrder ?? index),
    };
  }

  getViewState(): ViewState {
    const evaluated = this.checked || this.instantFeedback;
    const answers: AnswerState[] = this.answers.map((answer, index) => {
      const selected = this.selected.has(index);
      const correct = evaluated && selected && !!answer.correct;
      const wrong = evaluated && selected && !answer.correct;
      const shouldCheck = this.solutionsVisible && !!answer.correct;
      const shouldNotCheck = this.solutionsVisible && !answer.correct;
      const feedback = this.checked
        ? selected
          ? answer.tipsAndFeedback?.chosenFeedback
          : answer.tipsAndFeedback?.notChosenFeedback
        : undefined;
      const scorePoints = this.checked && selected && !this.singleAnswer && !this.behaviour.singlePoint && this.behaviour.showScorePoints
        ? (answer.correct ? answer.weight ?? 1 : -(answer.weight ?? 1))
        : undefined;

      return {
        answer,
        index,
        selected,
        correct,
        wrong,
        shouldCheck,
        shouldNotCheck,
        feedback,
        tipOpen: this.openTip === index,
        scorePoints,
      };
    });

    return {
      answers,
      score: this.score,
      maxScore: this.maxScore,
      feedbackText: this.feedbackText,
      checked: this.checked,
      answered: this.answered,
      solutionsVisible: this.solutionsVisible,
      feedbackVisible: this.feedbackVisible,
      inputDisabled: this.inputDisabled,
      retryHidden: this.retryHidden,
      singleAnswer: this.singleAnswer,
      role: this.singleAnswer ? 'radiogroup' : 'group',
    };
  }

  private hideEvaluationFor(index: number): void {
    if (!this.checked && !this.solutionsVisible) {
      this.instantFeedback = false;
    }
    if (this.openTip === index) {
      this.openTip = undefined;
    }
  }
}
