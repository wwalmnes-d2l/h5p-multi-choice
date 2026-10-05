export type QuestionType = 'auto' | 'single' | 'multi';

export interface TipsAndFeedback {
  tip?: string;
  chosenFeedback?: string;
  notChosenFeedback?: string;
}

export interface Answer {
  text?: string;
  correct?: boolean;
  weight?: number;
  tipsAndFeedback?: TipsAndFeedback;
  originalOrder?: number;
}

export interface MediaParameters {
  library?: string;
  params?: Record<string, unknown>;
}

export interface MediaConfig {
  type?: MediaParameters;
  disableImageZooming?: boolean;
}

export interface UIStrings {
  checkAnswerButton: string;
  submitAnswerButton: string;
  showSolutionButton: string;
  tryAgainButton: string;
  scoreBarLabel: string;
  tipAvailable: string;
  tipsLabel: string;
  feedbackAvailable: string;
  readFeedback: string;
  correctAnswer: string;
  wrongAnswer: string;
  shouldCheck: string;
  shouldNotCheck: string;
  noInput: string;
  a11yCheck: string;
  a11yShowSolution: string;
  a11yRetry: string;
}

export interface Behaviour {
  enableRetry: boolean;
  enableSolutionsButton: boolean;
  enableCheckButton: boolean;
  type: QuestionType;
  singlePoint: boolean;
  randomAnswers: boolean;
  showSolutionsRequiresInput: boolean;
  autoCheck: boolean;
  passPercentage: number;
  showScorePoints: boolean;
  confirmCheckDialog?: boolean;
  confirmRetryDialog?: boolean;
}

export interface ConfirmationStrings {
  header?: string;
  body?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}

export interface MultiChoiceOptions {
  media?: MediaConfig;
  question?: string;
  answers?: Answer[];
  overallFeedback?: Array<{ from: number; to: number; feedback?: string }>;
  weight?: number;
  UI?: Partial<UIStrings>;
  behaviour?: Partial<Behaviour>;
  confirmRetry?: ConfirmationStrings;
  confirmCheck?: ConfirmationStrings;
}

export interface PreviousState {
  answers?: number[];
}

export interface ContentData {
  previousState?: PreviousState;
  metadata?: { title?: string };
  standalone?: boolean;
  isScoringEnabled?: boolean;
  isReportingEnabled?: boolean;
}

export interface AnswerState {
  answer: Answer;
  index: number;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  shouldCheck: boolean;
  shouldNotCheck: boolean;
  feedback?: string;
  tipOpen: boolean;
  scorePoints?: number;
}

export interface ViewState {
  answers: AnswerState[];
  score: number;
  maxScore: number;
  feedbackText: string;
  checked: boolean;
  answered: boolean;
  solutionsVisible: boolean;
  feedbackVisible: boolean;
  inputDisabled: boolean;
  retryHidden: boolean;
  singleAnswer: boolean;
  role: 'radiogroup' | 'group';
}

export interface StateChangeDetail {
  state: ViewState;
  selected: number[];
}

export interface MediaSlotDetail {
  element: HTMLElement;
  media: MediaConfig;
}

export interface MultiChoiceEventMap {
  interacted: CustomEvent<StateChangeDetail>;
  changed: CustomEvent<StateChangeDetail>;
  answered: CustomEvent<StateChangeDetail>;
  resize: CustomEvent<void>;
  'media-slot': CustomEvent<MediaSlotDetail>;
}

export const DEFAULT_UI: UIStrings = {
  checkAnswerButton: 'Check',
  submitAnswerButton: 'Submit',
  showSolutionButton: 'Show solution',
  tryAgainButton: 'Try again',
  scoreBarLabel: 'You got :num out of :total points',
  tipAvailable: 'Tip available',
  tipsLabel: 'Show tip',
  feedbackAvailable: 'Feedback available',
  readFeedback: 'Read feedback',
  correctAnswer: 'Correct answer',
  wrongAnswer: 'Wrong answer',
  shouldCheck: 'Should have been checked',
  shouldNotCheck: 'Should not have been checked',
  noInput: 'Input is required before viewing the solution',
  a11yCheck: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
  a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
  a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
};

export const DEFAULT_BEHAVIOUR: Behaviour = {
  enableRetry: true,
  enableSolutionsButton: true,
  enableCheckButton: true,
  type: 'auto',
  singlePoint: true,
  randomAnswers: false,
  showSolutionsRequiresInput: true,
  autoCheck: false,
  passPercentage: 100,
  showScorePoints: true,
};
