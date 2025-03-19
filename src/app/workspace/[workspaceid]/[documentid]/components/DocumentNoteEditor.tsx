'use client';

import type React from 'react';

import { useSession } from 'next-auth/react';
import { useRef, useEffect, useCallback } from 'react';
import EditorJS, {
  type ToolConstructable,
  type OutputData,
} from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Delimiter from '@editorjs/delimiter';
import Paragraph from '@editorjs/paragraph';
import Table from '@editorjs/table';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import CodeTool from '@editorjs/code';
import axios from 'axios';

interface DocumentNoteEditorProps {
  workspaceId: string;
  documentId: string;
  modelResponse?: any;
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
  modelResponse,
}) => {
  const { data: session } = useSession();
  const emailUser = session?.user?.email;

  const editorRef = useRef<EditorJS | null>(null);
  const isFetchedRef = useRef(false);
  const hasInitialized = useRef(false);
  const prevModelResponseRef = useRef<any>(null);

  // Fetch document content
  const getDocumentOutput = useCallback(async () => {
    if (!isFetchedRef.current) {
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`
        );
        if (response.data?.data?.content) {
          editorRef.current?.render(response.data.data.content);
        }
        isFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching document:', error);
      }
    }
  }, [workspaceId, documentId]);

  // Save document content
  const saveDocument = useCallback(async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          {
            content: outputData,
          }
        );
      } catch (error) {
        console.error('Saving failed', error);
      }
    }
  }, [workspaceId, documentId]);

  // Initialize EditorJS
  const initEditor = useCallback(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      editorRef.current = new EditorJS({
        onChange: saveDocument,
        onReady: getDocumentOutput,
        holder: 'editorjs',
        tools: {
          header: Header,
          delimiter: Delimiter,
          paragraph: {
            class: Paragraph as unknown as ToolConstructable,
            inlineToolbar: true,
          },
          table: Table,
          list: {
            class: List as unknown as ToolConstructable,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+L',
            config: { defaultStyle: 'unordered' },
          },
          checklist: {
            class: Checklist,
            shortcut: 'CMD+SHIFT+C',
            inlineToolbar: true,
          },
          code: { class: CodeTool, shortcut: 'CMD+SHIFT+P' },
        },
      });
    }
  }, [saveDocument, getDocumentOutput]);

  // Append model response as a new block
  const appendModelResponse = useCallback(
    async (response: any) => {
      if (!editorRef.current) return;

      try {
        const currentContent = await editorRef.current.save();
        let newBlock;

        if (response && response.blocks) {
          newBlock = response.blocks;
        } else {
          newBlock = [
            {
              type: 'paragraph',
              data: {
                text:
                  typeof response === 'string'
                    ? response
                    : JSON.stringify(response),
              },
            },
          ];
        }

        const updatedContent: OutputData = {
          time: new Date().getTime(),
          blocks: [...(currentContent.blocks || []), ...newBlock],
          version: currentContent.version || '2.30.8', // Ensure version consistency
        };

        // Render the updated content
        await editorRef.current.render(updatedContent);

        // Scroll to the last block after rendering
        setTimeout(() => {
          if (editorRef.current) {
            const lastBlockIndex = updatedContent.blocks.length - 1;
            editorRef.current.caret.setToBlock(lastBlockIndex, 'end');
          }
        }, 300);

        saveDocument();
      } catch (error) {
        console.error('Error appending model response:', error);
      }
    },
    [saveDocument]
  );

  useEffect(() => {
    if (session) {
      initEditor();
    }
  }, [session, initEditor]);

  // Effect to handle model response changes
  useEffect(() => {
    // Only process if there's a new response and it's different from the previous one
    if (
      modelResponse &&
      modelResponse !== prevModelResponseRef.current &&
      editorRef.current
    ) {
      appendModelResponse(modelResponse);
      prevModelResponseRef.current = modelResponse;
    }
  }, [modelResponse, appendModelResponse]);

  return <div id="editorjs" className="flex w-full flex-1"></div>;
};

export default DocumentNoteEditor;
