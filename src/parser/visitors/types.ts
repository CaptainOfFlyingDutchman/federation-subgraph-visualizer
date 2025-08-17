import type {
  FieldSnippets,
  TypeSnippets,
  XyFlowEdge,
  XyFlowNode,
} from '@/types';

export type VisitorFnArgs = {
  nodes: XyFlowNode[];
  edges: XyFlowEdge[];
  typeSnippets: TypeSnippets;
  fieldSnippets: FieldSnippets;
};
