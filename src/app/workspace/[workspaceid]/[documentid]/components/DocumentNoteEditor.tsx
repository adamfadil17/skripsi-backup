'use client';

import { useSession } from 'next-auth/react';
import { useRef, useEffect, useCallback } from 'react';
import EditorJS, { ToolConstructable } from '@editorjs/editorjs';
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
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
}) => {
  const { data: session } = useSession();
  const emailUser = session?.user?.email;

  const editorRef = useRef<EditorJS | null>(null);
  const isFetchedRef = useRef(false); // Menggunakan useRef untuk tracking state tanpa menyebabkan re-render
  const hasInitialized = useRef(false); // Mencegah re-inisialisasi editor

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
      hasInitialized.current = true; // Mencegah re-inisialisasi
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

  useEffect(() => {
    if (session) {
      initEditor();
    }
  }, [session, initEditor]);

  return (
    <div className="flex w-full flex-1">
      <div
        id="editorjs"
        className="w-full h-full min-h-[400px] flex-grow border border-gray-300 rounded-md p-4"
      ></div>
    </div>
  );
};

export default DocumentNoteEditor;
