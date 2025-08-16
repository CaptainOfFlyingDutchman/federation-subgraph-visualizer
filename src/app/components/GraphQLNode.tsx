import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import type { NodeData } from '@/parser/graphqlToReactFlow';
import type { TitleBackgroundColor } from '@/types';
import { GraphQLNodeFieldRow } from '@/app/components/GraphQLNodeFieldRow';

export type GraphQLNodeProps = NodeProps<Node<NodeData>>;

const titleBackgroundColors: Record<NodeData['kind'], TitleBackgroundColor> = {
  object: 'bg-blue-600',
  interface: 'bg-purple-600',
  union: 'bg-orange-700',
  input: 'bg-green-600',
  enum: 'bg-orange-500',
  scalar: 'bg-gray-500',
};

export function GraphQLNode({ data }: GraphQLNodeProps) {
  const { kind, label, fields } = data;
  const titleBgColor = titleBackgroundColors[kind];

  return (
    <div className="min-w-[200px] border border-gray-300 rounded-md bg-white shadow">
      <button
        className={`w-full text-left py-1.5 px-2.5 rounded-t-md text-white font-semibold text-[13px] ${titleBgColor}`}
      >
        {label}
      </button>

      <div className="max-h-[260px]">
        {(fields || []).length === 0 ? (
          <p className="py-1.5 px-2.5 text-gray-600 text-xs">No fields</p>
        ) : (
          (fields || []).map((field) => (
            <GraphQLNodeFieldRow
              key={field.name}
              field={field}
              nodeName={label}
            />
          ))
        )}
      </div>

      <Handle type="target" position={Position.Top} />
    </div>
  );
}
