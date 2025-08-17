import { XyFlowEdge, XyFlowNode } from '@/types';
import { FieldSnippets, TypeSnippets } from '@/parser/graphqlToReactFlow';

export type VisitorFnArgs = {
  nodes: XyFlowNode[];
  edges: XyFlowEdge[];
  typeSnippets: TypeSnippets;
  fieldSnippets: FieldSnippets;
};
