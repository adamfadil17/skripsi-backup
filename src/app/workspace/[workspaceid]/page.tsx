import Image from 'next/image';
import React from 'react';

const WorkspacePage = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 bg-white">
      {/* Main Content */}
      <div className="max-w-[800px] w-full text-center">
        {/* Workspace Illustration */}
        <div className="relative w-full aspect-[2/1] mb-6">
          <Image
            src="/images/workspace-placeholder.png"
            alt="Select Document"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold mb-3 text-primary">
          Pick or Create One Document from the Workspace to View
        </h1>
        <p className="text-lg text-gray-500 mb-4 mx-auto max-w-[600px]">
          By selecting a document, you can collaboratively write notes in real
          time with other workspace members.
        </p>
      </div>
    </div>
  );
};

export default WorkspacePage;
