import { type NodeProps, NodeResizer } from '@xyflow/react';

import type { XyFlowNode } from '@/types';

export type GraphQLGroupNodeProps = NodeProps<XyFlowNode>;

export function GraphQLGroupNode({ data, selected }: GraphQLGroupNodeProps) {
  return (
    <div className="relative w-full h-full rounded-md border border-gray-300 bg-slate-50/80">
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={120}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: 'border-gray-300' }}
      />
      <div className="sticky top-0 z-10 px-3 py-1.5 text-sm font-semibold text-slate-800 bg-slate-200/80 rounded-t-md border-b border-slate-300">
        {data.label}
      </div>

      <div className="p-3" />
    </div>
  );
}
