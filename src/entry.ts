import { MultiChoiceModel } from './domain/model';
import type { ContentData, MultiChoiceOptions, StateChangeDetail } from './domain/types';
import './components/multichoice-view';
import { defineMultiChoiceElement, MultiChoiceView } from './components/multichoice-view';

const h5p = (globalThis as typeof globalThis & { H5P: H5PGlobal }).H5P;
defineMultiChoiceElement();
let counter = 0;

const stripHtml = (value: string): string => {
  const element = document.createElement('div');
  element.innerHTML = value;
  return element.textContent ?? '';
};

class MultiChoice extends h5p.Question {
  contentId: number;
  contentData: ContentData;
  model!: MultiChoiceModel;
  view?: MultiChoiceView;
  private mediaInstances: H5PMediaRunnable[] = [];

  constructor(options: MultiChoiceOptions = {}, contentId: number, contentData: ContentData = {}) {
    super('multichoice', { theme: true });
    this.contentId = contentId;
    this.contentData = contentData;
    counter += 1;
    this.model = new MultiChoiceModel(options, contentData, `h5p-mcq${counter}`);
    this.answered = false;
  }
  
  isRoot(): boolean {
    return !!this.contentData?.standalone;
  }

  registerDomElements(): void {
    const view = document.createElement('h5p-multichoice') as MultiChoiceView;
    view.classList.add('h5p-multichoice');
    view.setAttribute('content-id', `${this.contentId}`);
    view.model = this.model;
    view.addEventListener('interacted', () => this.triggerXAPI('interacted'));
    view.addEventListener('changed', () => this.trigger('resize'));
    view.addEventListener('resize', () => this.trigger('resize'));
    view.addEventListener('answered', (event) => this.onAnswered((event as CustomEvent<StateChangeDetail>).detail));
    view.addEventListener('media-slot', (event) => this.mountMedia((event as CustomEvent).detail));
    this.view = view;

    this.setContent(h5p.jQuery(view), {
      class: this.model.singleAnswer ? 'h5p-radio' : 'h5p-check',
    });
  }

  showAllSolutions(): void {
    this.model.showSolutions(false);
    this.refreshView(true);
  }

  showSolutions(): void {
    this.model.showSolutions(true);
    this.refreshView(true);
  }

  hideSolutions(): void {
    this.model.hideSolutions();
    this.refreshView(false);
  }

  showCheckSolution(skipFeedback = false): void {
    this.model.showCheckSolution(skipFeedback);
    this.refreshView(false);
  }

  resetTask(moveFocus = false): void {
    this.model.reset();
    this.answered = false;
    this.refreshView(moveFocus);
  }

  getCurrentState(): { answers: number[] } {
    return this.model.getCurrentState();
  }

  getAnswerGiven(ignoreCheck = false): boolean {
    return (ignoreCheck ? false : this.answered) || this.model.answerGiven;
  }

  getScore(): number {
    return this.model.score;
  }

  getMaxScore(): number {
    return this.model.maxScore;
  }

  getXAPIData(): { statement: Record<string, any> } {
    const event = this.createXAPIEventTemplate('answered');
    this.addQuestionToXAPI(event);
    this.addResponseToXAPI(event);
    return { statement: event.data.statement };
  }

  getTitle(): string {
    const title = this.contentData.metadata?.title || 'Multiple Choice';
    return h5p.createTitle ? h5p.createTitle(title) : title;
  }

  pause(): void {
    this.mediaInstances.forEach((instance) => instance.pause?.());
  }

  play(): void {
    this.mediaInstances.forEach((instance) => instance.play?.());
  }

  private onAnswered(detail: StateChangeDetail): void {
    this.answered = true;
    const event = this.createXAPIEventTemplate('answered');
    this.addQuestionToXAPI(event);
    this.addResponseToXAPI(event, detail);
    this.trigger(event);
  }

  private refreshView(focus: boolean): void {
    this.view?.refresh();
    if (focus) {
      this.view?.focusFirstAnswer();
    }
    this.trigger('resize');
  }

  private mountMedia(detail: { element: HTMLElement; media: MultiChoiceOptions['media'] }): void {
    const media = detail.media?.type;
    if (!media?.library || !h5p.newRunnable) {
      return;
    }
    const instance = h5p.newRunnable(
      { library: media.library, params: media.params ?? {} },
      this.contentId,
      h5p.jQuery(detail.element),
      true,
    );
    this.mediaInstances.push(instance);
    instance.on('resize', () => this.trigger('resize'));
  }

  private addQuestionToXAPI(event: H5PXAPIEvent): void {
    const definition = event.getVerifiedStatementValue(['object', 'definition']);
    definition.description = { 'en-US': this.model.question };
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'choice';
    definition.correctResponsesPattern = [];
    definition.choices = this.model.answers.map((answer) => ({
      id: `${answer.originalOrder}`,
      description: { 'en-US': stripHtml(answer.text ?? '') },
    }));

    const correct = this.model.answers
      .filter((answer) => answer.correct)
      .map((answer) => `${answer.originalOrder}`);
    if (this.model.singleAnswer) {
      definition.correctResponsesPattern = correct;
    } else if (correct.length) {
      definition.correctResponsesPattern = [correct.join('[,]')];
    }
  }

  private addResponseToXAPI(event: H5PXAPIEvent, detail?: StateChangeDetail): void {
    const score = detail?.state.score ?? this.model.score;
    const maxScore = detail?.state.maxScore ?? this.model.maxScore;
    const success = maxScore > 0 && (100 * score) / maxScore >= this.model.behaviour.passPercentage;
    event.setScoredResult(score, maxScore, this, true, success);
    event.data.statement.result.response = this.model.getCurrentState().answers.join('[,]');
  }
}

(h5p as H5PGlobal & { MultiChoice?: typeof MultiChoice }).MultiChoice = MultiChoice;
