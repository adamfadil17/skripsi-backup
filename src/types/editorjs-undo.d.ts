declare module 'editorjs-undo' {
  interface UndoOptions {
    editor: any;
    maxLength?: number;
  }

  class Undo {
    constructor(options: UndoOptions);

    /**
     * Undo the last change
     */
    undo(): void;

    /**
     * Redo the last undone change
     */
    redo(): void;

    /**
     * Update the undo/redo stack
     */
    updateStack(): void;

    /**
     * Clear the undo/redo stack
     */
    clear(): void;
  }

  export default Undo;
}
