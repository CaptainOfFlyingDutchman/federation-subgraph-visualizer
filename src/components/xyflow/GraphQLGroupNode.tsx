import type { Node, NodeProps } from '@xyflow/react';
import type { NodeData } from '@/parser/graphqlToReactFlow';

export type GraphQLGroupNodeProps = NodeProps<Node<NodeData>>;

export function GraphQLGroupNode({ data }: GraphQLGroupNodeProps) {
  return (
    <div className="relative rounded-md border border-gray-300 bg-slate-50/80">
      <div className="sticky top-0 z-10 px-3 py-1.5 text-sm font-semibold text-slate-800 bg-slate-200/80 rounded-t-md border-b border-slate-300">
        {data.label}
      </div>

      <div className="p-3" />
    </div>
  );
}
