import Image from 'next/image';
import React from 'react';

const WorkspacePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      {/* Main Content */}
      <div className="max-w-[800px] w-full text-center">
        {/* 404 Illustration */}
        <div className="relative w-full aspect-[2/1] mb-2">
          <Image
            src="/images/workspace-placeholder.png"
            alt="Select Document"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold mb-2 text-primary">
          Pick or Create One Document from the Workspace to View
        </h1>
        <p className="text-lg text-gray-500 mb-2">
          By selecting a document, you can collaboratively write notes in real
          time with other workspace members."
        </p>
      </div>
    </div>
  );
};

export default WorkspacePage;
