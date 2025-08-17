'use client';

import { useSourceContext } from '@/app/components/SourceContext';
import { useState } from 'react';
import { SourceViewer } from '@/app/components/SourceViewer';

export function SourceDrawer() {
  const { close, current, isOpen } = useSourceContext();

  const [activeTab, setActiveTab] = useState(0);

  if (!current || !isOpen) {
    return null;
  }

  const snippets = current.snippets;

  return (
    <div className="fixed z-50 right-0 top-0 h-full w-[600px] max-w-[85vw] bg-white shadow-xl border-l border-zinc-200 flex flex-col">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
        <p className="font-semibold text-sm text-zinc-800 truncate">
          {current.title}
        </p>
        <button
          onClick={close}
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Snippets */}
      <div className="px-3 pt-2">
        {snippets.length > 1 && (
          <div className="flex gap-2 mb-2 overflow-auto">
            {snippets.map((snippet, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-2 py-1 rounded text-sm border ${
                  activeTab === index ? 'bg-zinc-200' : 'bg-white'
                }`}
              >
                <span>
                  {snippet.moduleName}{' '}
                  {`(L${snippet.startLine}-${snippet.endLine})`}
                </span>
              </button>
            ))}
          </div>
        )}

        {snippets.length === 0 ? (
          <p className="text-xs text-zinc-600">No source available</p>
        ) : (
          <p className="mb-3 text-[11px] text-zinc-600">
            Showing {snippets[0].moduleName}
          </p>
        )}
      </div>

      <div className="p-3 overflow-auto">
        {snippets[activeTab] && (
          <SourceViewer
            code={snippets[activeTab].code}
            startLine={snippets[activeTab].startLine}
            showLineNumbers
          />
        )}
      </div>
    </div>
  );
}
