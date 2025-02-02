'use client';

import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
// import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';
import CodeTool from '@editorjs/code';
import ImageTool from '@editorjs/image';
// import LinkTool from '@editorjs/link';

export const DocumentNoteEditor = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const [editorData, setEditorData] = useState<any>(null);

  useEffect(() => {
    if (!editorRef.current) {
      const editor = new EditorJS({
        holder: 'editorjs',
        tools: {
          header: Header,
          list: List,
          //   checklist: Checklist,
          quote: Quote,
          code: CodeTool,
          image: {
            class: ImageTool,
            config: {
              endpoints: {
                byFile: 'http://localhost:3000/api/uploadImage', // You need to implement this API endpoint
              },
            },
          },
          //   linkTool: LinkTool,
        },
        data: {
          blocks: [
            {
              type: 'header',
              data: {
                text: 'Welcome to Editor.js',
                level: 1,
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Start editing to see some magic happen!',
              },
            },
          ],
        },
        onChange: async () => {
          const content = await editor.save();
          setEditorData(content);
        },
      });

      editorRef.current = editor;
    }

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
    };
  }, []);

  const handleSave = async () => {
    if (editorRef.current) {
      const content = await editorRef.current.save();
      console.log('Saved content:', content);
    }
  };

  return <div id="editorjs" className="flex w-full flex-1"></div>;
};
