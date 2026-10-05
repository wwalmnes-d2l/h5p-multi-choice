export {};

declare global {
  interface H5PQuestion {
    answered: boolean;
    setContent(content: unknown, options?: { class?: string }): this;
    addButton(...args: unknown[]): this;
    setFeedback(...args: unknown[]): this;
    updateFeedbackContent(content: string, extendContent?: boolean): this;
    removeFeedback(): this;
    read(content: string): void;
    trigger(event: unknown, data?: unknown): void;
    triggerXAPI(verb: string): void;
    createXAPIEventTemplate(verb: string): H5PXAPIEvent;
    getAnswerGiven?(ignoreCheck?: boolean): boolean;
    isRoot?(): boolean;
  }

  interface H5PXAPIEvent {
    data: { statement: Record<string, any> };
    getVerifiedStatementValue(path: string[]): any;
    setScoredResult(score: number, maxScore: number, instance: H5PQuestion, completion: boolean, success: boolean): void;
  }

  interface H5PMediaRunnable {
    on(event: string, callback: () => void): void;
    trigger(event: string): void;
    pause?(): void;
    play?(): void;
  }

  interface H5PGlobal {
    Question: new (...args: any[]) => H5PQuestion;
    jQuery: (element: unknown) => unknown;
    getPath?: (path: string, contentId: number) => string;
    newRunnable?: (params: unknown, contentId: number, container: unknown, standalone?: boolean) => H5PMediaRunnable;
    createTitle?: (title: string) => string;
  }

  interface Window {
    H5P: H5PGlobal;
  }
}
