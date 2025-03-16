'use client';

import React, { useEffect, useRef, useState } from 'react';
import EditorJS, { ToolConstructable } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import CodeTool from '@editorjs/code';
import axios from 'axios';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

interface DocumentNoteEditorProps {
  params: {
    workspaceId: string;
    documentId: string;
    contentId: string;
  };
}

const DocumentNoteEditor: React.FC<DocumentNoteEditorProps> = ({ params }) => {
  const editorRef = useRef<EditorJS | null>(null);
  const [isFetched, setIsFetched] = useState(false);

  useEffect(() => {
    const initializeEditor = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) return;

      const editor = new EditorJS({
        holder: 'editorjs',
        tools: {
          header: Header,
          delimiter: Delimiter,
          table: Table,
          list: {
            class: List as unknown as ToolConstructable,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+L',
            config: {
              defaultStyle: 'unordered',
            },
          },
          checklist: { class: Checklist, inlineToolbar: true },
          code: { class: CodeTool, shortcut: 'CMD+SHIFT+P' },
        },
        onChange: () => saveDocument(),
      });

      editorRef.current = editor;

      // Fetch awal untuk mendapatkan isi dokumen
      fetchDocumentContent();
    };

    initializeEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Fetch hanya sekali saat pertama kali load
  const fetchDocumentContent = async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${params.workspaceId}/document/${params.documentId}/content/${params.contentId}`
      );
      const content = response.data;

      if (editorRef.current && !isFetched) {
        editorRef.current.render(content);
        setIsFetched(true);
      }
    } catch (error) {
      console.error('Error fetching document content:', error);
    }
  };

  const saveDocument = async () => {
    if (!editorRef.current) return;

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return;

    const content = await editorRef.current.save();

    try {
      await axios.put(
        `/api/workspace/${params.workspaceId}/document/${params.documentId}/content/${params.contentId}`,
        {
          content,
          editedById: currentUser.id,
        }
      );
    } catch (error) {
      console.error('Error saving document content:', error);
    }
  };

  return (
    <div className="lg:mr-40">
      <div id="editorjs"></div>
    </div>
  );
};

export default DocumentNoteEditor;
