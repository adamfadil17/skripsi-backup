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
import toast from 'react-hot-toast';

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

  const getDocumentOutput = useCallback(async () => {
    if (!isFetchedRef.current) {
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`
        );

        if (
          response.data?.status === 'success' &&
          response.data.data?.content
        ) {
          editorRef.current?.render(response.data.data.content);
        } else {
          toast.error(
            response.data?.message || 'Failed to load document content.'
          );
        }
        isFetchedRef.current = true;
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'An unexpected error occurred.'
        );
      }
    }
  }, [workspaceId, documentId]);

  const saveDocument = useCallback(async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        // Here we convert inlineToolbar to <b> tags before saving.
        const formattedContent = convertEditorDataToHtml(outputData);

        const response = await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          { content: formattedContent }
        );

        if (response.data?.status !== 'success') {
          toast.error(
            response.data?.message || 'Failed to save document content'
          );
        }
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'An unexpected error occurred.'
        );
      }
    }
  }, [workspaceId, documentId]);

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

  const appendModelResponse = useCallback(
    async (response: any) => {
      if (!editorRef.current) return;

      try {
        const currentContent = await editorRef.current.save();
        let newBlock;

        if (response && response.blocks) {
          newBlock = response.blocks.map((block: any) => {
            if (block.type === 'paragraph' && block.data.text) {
              let text = block.data.text;
              const inlineTools = [];

              // Find bold sections using Markdown syntax (**bold text**)
              const boldRegex = /\*\*(.*?)\*\*/g;
              let match;

              while ((match = boldRegex.exec(text)) !== null) {
                const boldText = match[1];
                const startIndex = match.index;
                inlineTools.push({
                  offset: startIndex,
                  length: boldText.length,
                  type: 'bold',
                });
                text = text.replace(`**${boldText}**`, boldText); // Remove the markdown bold characters
              }

              return {
                ...block,
                data: {
                  ...block.data,
                  text: text,
                  inlineToolbar: inlineTools,
                },
              };
            }
            return block;
          });
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
          version: currentContent.version || '2.30.8',
        };

        await editorRef.current.render(updatedContent);

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

  useEffect(() => {
    if (
      modelResponse &&
      modelResponse !== prevModelResponseRef.current &&
      editorRef.current
    ) {
      appendModelResponse(modelResponse);
      prevModelResponseRef.current = modelResponse;
    }
  }, [modelResponse, appendModelResponse]);

  // Function to convert Editor.js data to HTML with <b> tags
  function convertEditorDataToHtml(data: OutputData): OutputData {
    data.blocks.forEach((block) => {
      if (block.type === 'paragraph' && block.data.inlineToolbar) {
        let text = block.data.text;
        const inlineTools = block.data.inlineToolbar;

        // Sort inline tools by offset (descending) to apply them correctly
        inlineTools.sort((a: any, b: any) => b.offset - a.offset);

        inlineTools.forEach((tool: any) => {
          if (tool.type === 'bold') {
            const startTag = '<b>';
            const endTag = '</b>';
            text =
              text.slice(0, tool.offset) +
              startTag +
              text.slice(tool.offset, tool.offset + tool.length) +
              endTag +
              text.slice(tool.offset + tool.length);
          }
        });
        block.data.text = text;
        delete block.data.inlineToolbar; // Remove inlineToolbar after conversion.
      }
    });
    return data;
  }

  return <div id="editorjs" className="flex w-full flex-1"></div>;
};

export default DocumentNoteEditor;
