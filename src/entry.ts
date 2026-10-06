import { MultiChoiceModel } from './domain/model';
import type {
  ConfirmationStrings,
  ContentData,
  MultiChoiceOptions,
  StateChangeDetail,
  ViewState,
} from './domain/types';
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
    view.addEventListener('changed', (event) => this.onViewStateChanged((event as CustomEvent<StateChangeDetail>).detail));
    view.addEventListener('resize', () => this.trigger('resize'));
    view.addEventListener('answered', (event) => this.onAnswered((event as CustomEvent<StateChangeDetail>).detail));
    view.addEventListener('media-slot', (event) => this.mountMedia((event as CustomEvent).detail));
    this.view = view;

    this.setContent(h5p.jQuery(view), {
      class: this.model.singleAnswer ? 'h5p-radio' : 'h5p-check',
    });
    this.registerButtons();
    this.updateButtonVisibility(this.model.getViewState());
  }

  showAllSolutions(): void {
    this.view?.showSolutions(false, true);
  }

  showSolutions(): void {
    if (!this.view?.showSolutions(true)) {
      this.read(this.model.UI.noInput);
    }
  }

  hideSolutions(): void {
    this.view?.hideSolutions();
  }

  showCheckSolution(skipFeedback = false): void {
    this.view?.showCheckSolution(skipFeedback);
  }

  resetTask(moveFocus = false): void {
    this.answered = false;
    if (this.view) {
      this.view.retry();
    } else {
      this.model.retry();
    }
    this.removeFeedback();
    this.updateButtonVisibility(this.model.getViewState());
    if (moveFocus) {
      this.view?.focusFirstAnswer();
    }
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
    this.onViewStateChanged(detail);
    const event = this.createXAPIEventTemplate('answered');
    this.addQuestionToXAPI(event);
    this.addResponseToXAPI(event, detail);
    this.trigger(event);
  }

  private registerButtons(): void {
    const behaviour = this.model.behaviour;
    const ui = this.model.UI;
    const canCheck = behaviour.enableCheckButton && (!behaviour.autoCheck || !this.model.singleAnswer);

    if (canCheck) {
      this.addButton(
        'check-answer',
        this.model.contentData?.isScoringEnabled ? ui.submitAnswerButton : ui.checkAnswerButton,
        () => {
          if (!this.model.answerGiven) {
            this.read(ui.noInput);
            return;
          }
          this.view?.check();
        },
        true,
        { 'aria-label': ui.a11yCheck },
        this.confirmationOptions(this.model.confirmCheck, behaviour.confirmCheckDialog, 'Finish'),
      );
    }

    this.addButton(
      'show-solution',
      ui.showSolutionButton,
      () => this.showSolutions(),
      behaviour.enableSolutionsButton,
      { 'aria-label': ui.a11yShowSolution },
    );

    if (behaviour.enableRetry) {
      this.addButton(
        'try-again',
        ui.tryAgainButton,
        () => this.resetTask(true),
        false,
        { 'aria-label': ui.a11yRetry },
        this.confirmationOptions(this.model.confirmRetry, behaviour.confirmRetryDialog, 'Retry'),
      );
    }
  }

  private confirmationOptions(
    strings: ConfirmationStrings | undefined,
    enabled: boolean | undefined,
    fallbackConfirmLabel: string,
  ): unknown {
    return {
      confirmationDialog: {
        enable: !!enabled,
        l10n: {
          header: strings?.header ?? `${fallbackConfirmLabel}?`,
          body: strings?.body ?? '',
          cancelLabel: strings?.cancelLabel ?? 'Cancel',
          confirmLabel: strings?.confirmLabel ?? fallbackConfirmLabel,
        },
        instance: this,
        $parentElement: h5p.jQuery(this.view),
      },
    };
  }

  private onViewStateChanged(detail: StateChangeDetail): void {
    const state = detail.state;
    if (state.feedbackVisible) {
      this.setFeedback(
        state.feedbackText,
        state.score,
        state.maxScore,
        this.model.UI.scoreBarLabel,
      );
    } else {
      this.removeFeedback();
    }
    this.updateButtonVisibility(state);
    this.trigger('resize');
  }

  private updateButtonVisibility(state: ViewState): void {
    const behaviour = this.model.behaviour;
    const canCheck = behaviour.enableCheckButton && (!behaviour.autoCheck || !this.model.singleAnswer);

    if (canCheck) {
      if (state.checked || state.solutionsVisible) {
        this.hideButton('check-answer');
      } else {
        this.showButton('check-answer');
      }
    }

    if (behaviour.enableSolutionsButton) {
      if (state.solutionsVisible) {
        this.hideButton('show-solution');
      } else {
        this.showButton('show-solution');
      }
    }

    if (behaviour.enableRetry) {
      if (!state.retryHidden && (state.checked || state.solutionsVisible)) {
        this.showButton('try-again');
      } else {
        this.hideButton('try-again');
      }
    }
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
