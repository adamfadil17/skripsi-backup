declare module "editorjs-undo" {
  interface UndoOptions {
    editor: any;
    maxLength?: number;
  }

  class Undo {
    constructor(options: UndoOptions);

    undo(): void;

    redo(): void;

    updateStack(): void;

    clear(): void;
  }

  export default Undo;
}
