'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { SourceSnippet } from '@/parser/graphqlToReactFlow';

export type SourceTarget = {
  title: string;
  kind: 'type' | 'field';
  nodeName: string;
  fieldName?: string;
  snippets: SourceSnippet[];
};

export type SourceContextValue = {
  open: (target: SourceTarget) => void;
  close: () => void;
  current: SourceTarget | null;
  isOpen: boolean;
};

const SourceContext = createContext<SourceContextValue | null>(null);

export type SourceProviderProps = { children: ReactNode };

export function SourceProvider({ children }: SourceProviderProps) {
  const [current, setCurrent] = useState<SourceTarget | null>(null);

  const value = useMemo(
    () => ({
      open: (target: SourceTarget) => {
        setCurrent(target);
      },
      close: () => {
        setCurrent(null);
      },
      current,
      isOpen: current !== null,
    }),
    [current],
  );

  return (
    <SourceContext.Provider value={value}>{children}</SourceContext.Provider>
  );
}

export function useSourceContext() {
  const context = useContext(SourceContext);

  if (!context) {
    throw new Error(
      'useSourceContext must be used within a <SourceProvider />',
    );
  }

  return context;
}
