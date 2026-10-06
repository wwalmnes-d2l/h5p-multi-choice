import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { classMap } from 'lit/directives/class-map.js';
import { MultiChoiceModel } from '../domain/model';
import type {
  MediaConfig,
  StateChangeDetail,
  ViewState,
} from '../domain/types';

const emit = <T>(target: EventTarget, name: string, detail: T): void => {
  target.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
};

export class MultiChoiceView extends LitElement {
  static properties = {
    model: { attribute: false },
    revision: { state: true },
  };

  declare model: MultiChoiceModel;
  declare revision: number;

  private mediaRequested = false;
  private message = '';

  constructor() {
    super();
    this.revision = 0;
  }

  createRenderRoot(): HTMLElement {
    return this;
  }

  refresh(): void {
    this.revision += 1;
  }

  focusFirstAnswer(): void {
    void this.updateComplete.then(() => {
      this.querySelector<HTMLElement>('.h5p-answer')?.focus();
    });
  }

  updated(): void {
    if (this.mediaRequested || !this.model?.media?.type) {
      return;
    }
    const library = this.model.media.type.library ?? '';
    if (!/^H5P\.(Video|Audio)\b/.test(library)) {
      return;
    }
    const slot = this.querySelector<HTMLElement>('[data-media-slot]');
    if (slot) {
      this.mediaRequested = true;
      emit(this, 'media-slot', { element: slot, media: this.model.media });
    }
  }

  render(): TemplateResult {
    if (!this.model) {
      return html``;
    }

    const state = this.model.getViewState();
    return html`
      <div class="h5p-multichoice-view">
        ${this.renderMedia(this.model.media)}
        <div id=${this.model.labelId} class="h5p-question-introduction">
          ${unsafeHTML(this.model.question)}
        </div>
        ${this.renderAnswers(state)}
        ${this.message ? html`<div class="h5p-multichoice-message" role="alert">${this.message}</div>` : nothing}
      </div>
    `;
  }

  private renderMedia(media: MediaConfig | undefined): TemplateResult | typeof nothing {
    const type = media?.type;
    const library = type?.library ?? '';
    const params = type?.params ?? {};

    if (library.startsWith('H5P.Image') && params.file && typeof params.file === 'object') {
      const file = params.file as { path?: string };
      const alt = typeof params.alt === 'string' ? this.stripHtml(params.alt) : '';
      const title = typeof params.title === 'string' ? this.stripHtml(params.title) : '';
      return html`
        <div class="h5p-question-image h5p-question-image-fill-width">
          <div class="h5p-question-image-wrap ${media?.disableImageZooming ? '' : 'h5p-question-image-scalable'}"
               role=${media?.disableImageZooming ? nothing : 'button'}
               tabindex=${media?.disableImageZooming ? nothing : '0'}
               @click=${(event: MouseEvent) => this.toggleImage(event)}
               @keydown=${(event: KeyboardEvent) => this.toggleImageKeyboard(event)}>
            <img src=${this.pathFor(file.path ?? '')} alt=${alt} title=${title} @load=${this.requestResize} />
          </div>
        </div>
      `;
    }

    if (library.startsWith('H5P.Video') || library.startsWith('H5P.Audio')) {
      return html`<div class="h5p-question-${library.startsWith('H5P.Video') ? 'video' : 'audio'}" data-media-slot></div>`;
    }

    return nothing;
  }

  private renderAnswers(state: ViewState): TemplateResult {
    return html`
      <ul class="h5p-answers" role=${state.role} aria-labelledby=${this.model.labelId}>
        ${state.answers.map((answer) => this.renderAnswer(answer, state))}
      </ul>
    `;
  }

  private renderAnswer(answer: ViewState['answers'][number], state: ViewState): TemplateResult {
    const tip = answer.answer.tipsAndFeedback?.tip?.trim();
    const hasTip = !!tip?.replace(/&nbsp;|<p>|<\/p>/g, '').trim();
    const classes = {
      'h5p-answer': true,
      'h5p-selected': answer.selected,
      'h5p-correct': answer.correct,
      'h5p-wrong': answer.wrong,
      'h5p-should': answer.shouldCheck,
      'h5p-should-not': answer.shouldNotCheck,
      'h5p-has-tip': hasTip,
    };
    const feedback = answer.tipOpen ? tip : answer.feedback;
    const feedbackIsTip = answer.tipOpen;

    return html`
      <li
        class=${classMap(classes)}
        role=${state.inputDisabled ? nothing : state.singleAnswer ? 'radio' : 'checkbox'}
        aria-checked=${state.inputDisabled ? nothing : answer.selected}
        aria-disabled=${state.inputDisabled}
        aria-label=${this.stripHtml(answer.answer.text ?? '')}
        tabindex=${this.tabIndexFor(answer, state)}
        data-id=${answer.index}
        @click=${() => this.select(answer.index)}
        @keydown=${(event: KeyboardEvent) => this.answerKeydown(event, answer.index, state)}>
        <div class="h5p-alternative-container">
          ${answer.correct || answer.wrong ? html`<div class="h5p-answer-icon" aria-label=${answer.correct ? this.model.UI.correctAnswer : this.model.UI.wrongAnswer}></div>` : nothing}
          <span class="h5p-alternative-inner">${unsafeHTML(answer.answer.text ?? '<div></div>')}</span>
          ${answer.scorePoints !== undefined ? html`
            <span class="h5p-question-${answer.scorePoints >= 0 ? 'plus' : 'minus'}-one-container">
              <span class="h5p-question-${answer.scorePoints >= 0 ? 'plus' : 'minus'}-one">${answer.scorePoints >= 0 ? '+' : ''}${answer.scorePoints}</span>
            </span>
          ` : nothing}
          ${answer.shouldCheck || answer.shouldNotCheck ? html`
            <div class="h5p-solution-icon-${state.singleAnswer ? 'radio' : 'checkbox'}"
                 aria-label=${answer.shouldCheck ? this.model.UI.shouldCheck : this.model.UI.shouldNotCheck}></div>
          ` : nothing}
          ${hasTip && !state.inputDisabled ? html`
            <div class="h5p-multichoice-tipwrap" aria-label=${`${this.model.UI.tipAvailable}.`}>
              <button class="multichoice-tip" type="button" title=${this.model.UI.tipsLabel}
                aria-label=${this.model.UI.tipsLabel} aria-expanded=${answer.tipOpen}
                @click=${(event: MouseEvent) => this.toggleTip(event, answer.index)}>
                <span class="joubel-icon-tip-normal"><span class="h5p-icon-shadow"></span><span class="h5p-icon-speech-bubble"></span><span class="h5p-icon-info"></span></span>
              </button>
            </div>
          ` : nothing}
        </div>
        ${feedback ? html`
          <div class="h5p-feedback-dialog ${feedbackIsTip ? 'h5p-has-tip' : ''}">
            <div class="h5p-feedback-inner">
              <div class="h5p-feedback-text">${unsafeHTML(feedback)}</div>
            </div>
          </div>
        ` : nothing}
      </li>
    `;
  }

  private select(index: number): void {
    this.model.select(index);
    this.refresh();
    const detail = this.detail();
    emit(this, 'changed', detail);
    emit(this, 'interacted', detail);
    if (this.model.isChecked) {
      emit(this, 'answered', detail);
    }
  }

  private answerKeydown(event: KeyboardEvent, index: number, state: ViewState): void {
    const answers = [...this.querySelectorAll<HTMLElement>('.h5p-answer')];
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.select(index);
      return;
    }
    if (state.singleAnswer && ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const current = answers.indexOf(event.currentTarget as HTMLElement);
      const next = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? current - 1 : current + 1;
      answers[next]?.focus();
      if (answers[next]) {
        this.select(Number(answers[next].dataset.id));
      }
    }
  }

  private toggleTip(event: MouseEvent, index: number): void {
    event.stopPropagation();
    this.model.toggleTip(index);
    this.refresh();
    emit(this, 'resize', undefined);
  }

  showSolutions(hideRetry = false, force = false): boolean {
    if (!force && this.model.behaviour.showSolutionsRequiresInput && !this.model.answerGiven) {
      this.message = this.model.UI.noInput;
      this.refresh();
      return false;
    }
    this.model.showSolutions(hideRetry);
    this.message = '';
    this.refresh();
    this.focusFirstAnswer();
    emit(this, 'changed', this.detail());
    emit(this, 'resize', undefined);
    return true;
  }

  check(): void {
    this.model.check();
    this.refresh();
    this.focusFirstAnswer();
    emit(this, 'changed', this.detail());
    emit(this, 'answered', this.detail());
    emit(this, 'resize', undefined);
  }

  retry(): void {
    this.model.retry();
    this.message = '';
    this.refresh();
    this.focusFirstAnswer();
    emit(this, 'changed', this.detail());
    emit(this, 'resize', undefined);
  }

  hideSolutions(): void {
    this.model.hideSolutions();
    this.message = '';
    this.refresh();
    emit(this, 'changed', this.detail());
    emit(this, 'resize', undefined);
  }

  showCheckSolution(skipFeedback = false): void {
    this.model.showCheckSolution(skipFeedback);
    this.refresh();
    emit(this, 'changed', this.detail());
    emit(this, 'resize', undefined);
  }

  private detail(): StateChangeDetail {
    return { state: this.model.getViewState(), selected: this.model.selectedIndices };
  }

  private tabIndexFor(answer: ViewState['answers'][number], state: ViewState): number {
    if (state.inputDisabled) {
      return -1;
    }
    if (!state.singleAnswer) {
      return 0;
    }
    const selected = state.answers.find((item) => item.selected);
    return selected ? (selected.index === answer.index ? 0 : -1) : answer.index === 0 ? 0 : -1;
  }

  private requestResize = (): void => emit(this, 'resize', undefined);

  private toggleImage(event: MouseEvent): void {
    if (event.button !== 0 || this.model.media?.disableImageZooming) {
      return;
    }
    (event.currentTarget as HTMLElement).classList.toggle('h5p-question-image-scaled');
    this.requestResize();
  }

  private toggleImageKeyboard(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleImage(new MouseEvent('click', { button: 0 }));
    }
  }

  private pathFor(path: string): string {
    const h5p = (globalThis as typeof globalThis & { H5P?: { getPath?: (path: string, id: number) => string } }).H5P;
    return h5p?.getPath ? h5p.getPath(path, this.contentId) : path;
  }

  private stripHtml(value: string): string {
    const element = document.createElement('div');
    element.innerHTML = value;
    return element.textContent ?? '';
  }

  private get contentId(): number {
    return Number(this.getAttribute('content-id') ?? 0);
  }
}

export function defineMultiChoiceElement(): void {
  const registry = globalThis.document?.defaultView?.customElements
    ?? (typeof window !== 'undefined' ? window.customElements : globalThis.customElements);
  if (!registry.get('h5p-multichoice')) {
    registry.define('h5p-multichoice', MultiChoiceView);
  }
}
