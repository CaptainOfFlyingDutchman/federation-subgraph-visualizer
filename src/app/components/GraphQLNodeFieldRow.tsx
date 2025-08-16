import type { NodeData, NodeField } from '@/parser/graphqlToReactFlow';
import { Handle, Position } from '@xyflow/react';

export type GraphQLNodeFieldRowProps = {
  field: NodeField;
  nodeName: NodeData['label'];
};
export function GraphQLNodeFieldRow({
  field,
  nodeName,
}: GraphQLNodeFieldRowProps) {
  return (
    <div className="relative flex py-0.5 px-2 text-xs leading-snug border-t border-gray-200 items-center odd:bg-gray-50 even:bg-white">
      <button className="flex-1 text-left text-gray-800 hover:underline hover:cursor-pointer">
        {field.name}
      </button>

      {field.type && <p className="text-gray-600 ml-2">{field.type}</p>}

      {field.hasOutgoing && (
        <Handle
          id={`field-${field.name}`}
          type="source"
          position={Position.Right}
        />
      )}
    </div>
  );
}
