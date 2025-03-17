'use client';

import React, { useEffect, useRef, useState } from 'react';
import EditorJS, { ToolConstructable } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import CodeTool from '@editorjs/code';
import Paragraph from '@editorjs/paragraph';
import { useSession } from 'next-auth/react';
import axios from 'axios';

interface DocumentNoteEditorProps {
  workspaceId: string;
  documentId: string;
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({
  workspaceId,
  documentId,
}) => {
  const ref = useRef<EditorJS | null>(null);
  let editor: EditorJS | null = null;
  let isFetched = false;

  const { data: session } = useSession();
  const emailUser = session?.user?.email;

  useEffect(() => {
    if (session) {
      initEditor();
    }
  }, [session]);

  const saveDocument = async () => {
    if (ref.current) {
      const outputData = await ref.current.save();
      try {
        await axios.put(
          `/api/workspace/${workspaceId}/document/${documentId}/content/`,
          {
            content: outputData, // Sesuaikan field dengan API
          }
        );
      } catch (error) {
        console.error('Error saving document:', error);
      }
    }
  };

  const getDocumentOutput = async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${workspaceId}/document/${documentId}/content/`
      );
      if (
        response.data &&
        (!isFetched || response.data.data.editedBy !== emailUser)
      ) {
        editor?.render(response.data.data.content);
      }
      isFetched = true;
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  const initEditor = () => {
    if (!editor) {
      editor = new EditorJS({
        onChange: () => {
          saveDocument();
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
      ref.current = editor;
    }
  };

  return <div id="editorjs" className="flex w-full flex-1"></div>;
};

export default DocumentNoteEditor;
