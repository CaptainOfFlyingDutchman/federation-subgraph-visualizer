import { createEdgeId, pushUnique } from '@/parser/utils';
import { UnionTypeDefinitionNode } from 'graphql/language';
import { VisitorFnArgs } from '@/parser/visitors/types';

export function getUnionTypeDefinition({
  edges,
}: Pick<VisitorFnArgs, 'edges'>) {
  return function UnionTypeDefinition(unionNode: UnionTypeDefinitionNode) {
    const sourceNode = unionNode.name.value;

    if (unionNode.types) {
      unionNode.types.forEach((member) => {
        const targetNode = member.name.value;

        pushUnique(
          edges,
          {
            id: createEdgeId(sourceNode, targetNode, 'member'),
            source: sourceNode,
            target: targetNode,
            animated: true,
            data: { relation: 'member' },
          },
          (e) => e.id,
        );
      });
    }
  };
}
