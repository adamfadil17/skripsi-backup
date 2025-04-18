'use client';

import type React from 'react';
import { useSession } from 'next-auth/react';
import { useRef, useEffect, useCallback, useState } from 'react';
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
import { usePusherChannelContext } from '../../components/PusherChannelProvider';

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
  const userEmail = session?.user?.email; // Use email instead of ID

  const editorRef = useRef<EditorJS | null>(null);
  const isFetchedRef = useRef(false);
  const hasInitialized = useRef(false);
  const prevModelResponseRef = useRef<any>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastInputTimeRef = useRef<number>(0);
  const hasInteractedRef = useRef(false);
  const isProcessingExternalUpdateRef = useRef(false);
  const [editorReady, setEditorReady] = useState(false);

  // Get the Pusher channel from context
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Debounce function to limit the frequency of function calls
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const saveDocument = useCallback(async () => {
    if (
      editorRef.current &&
      !isProcessingExternalUpdateRef.current &&
      userEmail
    ) {
      try {
        const outputData = await editorRef.current.save();
        // Convert inlineToolbar to <b> tags before saving
        const formattedContent = convertEditorDataToHtml(outputData);

        // Check if content has actually changed to avoid unnecessary saves
        const contentString = JSON.stringify(formattedContent);
        if (contentString === lastSavedContentRef.current) {
          return; // Skip save if content hasn't changed
        }

        lastSavedContentRef.current = contentString;

        const response = await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          {
            content: formattedContent,
            userEmail: userEmail, // Send email instead of ID
          }
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
  }, [workspaceId, documentId, userEmail]);

  // Add debounced save to prevent too many saves during typing
  const debouncedSave = useCallback(
    debounce(() => {
      saveDocument();
    }, 500),
    [saveDocument]
  );

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
          const content = response.data.data.content;
          editorRef.current?.render(content);
          // Store the initial content hash to avoid duplicate saves
          lastSavedContentRef.current = JSON.stringify(content);
        } else {
          toast.error(
            response.data?.message || 'Failed to load document content.'
          );
        }
        isFetchedRef.current = true;
        setEditorReady(true);
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
        onChange: () => {
          lastInputTimeRef.current = Date.now();
          debouncedSave();
        },
        onReady: () => {
          getDocumentOutput();
        },
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
  }, [debouncedSave, getDocumentOutput]);

  // Set up Pusher event listeners for real-time updates
  useEffect(() => {
    if (!workspaceChannel || !userEmail || !editorReady) return;

    console.log(
      'Setting up Pusher listeners for document content:',
      documentId
    );

    // Document content update event handler
    const handleDocumentContentUpdated = async (data: {
      content: OutputData;
      documentId: string;
      editorEmail: string;
    }) => {
      if (data.documentId === documentId && data.editorEmail !== userEmail) {
        const now = Date.now();
        const idleThreshold = 2000; // 2 seconds

        // Skip updates if no changes are made
        if (JSON.stringify(data.content) === lastSavedContentRef.current) {
          return;
        }

        // Capture scroll position before update
        const scrollPosition = window.scrollY;

        const applyUpdate = async () => {
          if (!editorRef.current) return;

          try {
            isProcessingExternalUpdateRef.current = true;

            const currentBlockIndex =
              editorRef.current.blocks.getCurrentBlockIndex();
            const cursorPosition = 'end';

            // Apply content update
            await editorRef.current.render(data.content);
            lastSavedContentRef.current = JSON.stringify(data.content);

            // Delay scroll or caret focus update to ensure smooth rendering
            setTimeout(() => {
              // Set caret position without affecting scroll
              if (editorRef.current && currentBlockIndex !== undefined) {
                editorRef.current.caret.setToBlock(
                  currentBlockIndex,
                  cursorPosition
                );
              }

              // Restore scroll position after update
              window.scrollTo(0, scrollPosition);

              isProcessingExternalUpdateRef.current = false;
            }, 100);
          } catch (error) {
            console.error('Error updating editor content:', error);
            isProcessingExternalUpdateRef.current = false;
          }
        };

        const timeSinceLastInput = now - lastInputTimeRef.current;

        if (timeSinceLastInput > idleThreshold) {
          await applyUpdate(); // Apply immediately
        } else {
          const delay = idleThreshold - timeSinceLastInput;
          setTimeout(() => {
            if (Date.now() - lastInputTimeRef.current >= idleThreshold) {
              applyUpdate();
            }
          }, delay);
        }
      }
    };

    // Subscribe to document content events
    workspaceChannel.bind(
      'document-content-updated',
      handleDocumentContentUpdated
    );

    // Cleanup
    return () => {
      console.log('Cleaning up Pusher listeners for document content');
      workspaceChannel.unbind(
        'document-content-updated',
        handleDocumentContentUpdated
      );
    };
  }, [workspaceChannel, documentId, userEmail, editorReady]);

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
    const newData = { ...data };
    newData.blocks = newData.blocks.map((block) => {
      if (block.type === 'paragraph' && block.data.inlineToolbar) {
        let text = block.data.text;
        const inlineTools = [...block.data.inlineToolbar];

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

        return {
          ...block,
          data: {
            ...block.data,
            text: text,
            // Remove inlineToolbar after conversion
            inlineToolbar: undefined,
          },
        };
      }
      return block;
    });
    return newData;
  }

  return <div id="editorjs" className="prose max-w-none w-full"></div>;
};

export default DocumentNoteEditor;
