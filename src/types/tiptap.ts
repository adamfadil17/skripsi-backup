// types/tiptap.ts - Create this file for shared TipTap types

export interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

export interface TipTapDocument {
  type: "doc";
  content?: TipTapNode[];
}

export interface DocumentContentResponse {
  content: TipTapDocument;
  editedAt: Date;
  editedBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
}

// Type guard functions
export function isTipTapDocument(content: any): content is TipTapDocument {
  return (
    content &&
    typeof content === "object" &&
    content.type === "doc" &&
    (content.content === undefined || Array.isArray(content.content))
  );
}

export function isTipTapNode(node: any): node is TipTapNode {
  return node && typeof node === "object" && typeof node.type === "string";
}
