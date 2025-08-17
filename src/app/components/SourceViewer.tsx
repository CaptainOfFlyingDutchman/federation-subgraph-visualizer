import type { SourceSnippet } from '@/parser/graphqlToReactFlow';
import { useEffect, useRef } from 'react';

import Prism from 'prismjs';
import 'prismjs/components/prism-graphql';
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

export type SourceViewerProps = {
  code: SourceSnippet['code'];
  startLine: SourceSnippet['startLine'];
  showLineNumbers: boolean;
};

export function SourceViewer({
  code,
  startLine,
  showLineNumbers,
}: SourceViewerProps) {
  const ref = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      Prism.highlightAllUnder(ref.current);
    }
  }, [code]);
  return (
    <pre
      ref={ref}
      aria-label="GraphQL source code"
      className={`text-xs leading-5 rounded border border-zinc-800 overflow-auto p-3 ${showLineNumbers ? 'line-numbers' : ''}`}
      data-start={startLine}
    >
      <code className="language-graphql">{code}</code>
    </pre>
  );
}
