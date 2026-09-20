import React from 'react';
import { ActionIcon, Box, Chip, Group, Text } from '@mantine/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { Kind } from '@/components/SortSection';

type Props = {
  order: Kind[];
  visible: Kind[];
  onOrderChange: (order: Kind[]) => void;
  onToggle: (kind: Kind) => void;
};

const AlgorithmSelector: React.FC<Props> = ({ order, visible, onOrderChange, onToggle }) => {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <Box my="lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          screenReaderInstructions: { draggable: t('reorder_instructions') },
          announcements: {
            onDragStart: ({ active }) => t('reorder_start', { name: t(String(active.id)) }),
            onDragOver: ({ active, over }) =>
              over
                ? t('reorder_position', {
                    name: t(String(active.id)),
                    position: order.indexOf(over.id as Kind) + 1,
                  })
                : undefined,
            onDragEnd: ({ active, over }) =>
              over
                ? t('reorder_end', {
                    name: t(String(active.id)),
                    position: order.indexOf(over.id as Kind) + 1,
                  })
                : t('reorder_cancel'),
            onDragCancel: () => t('reorder_cancel'),
          },
        }}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          onOrderChange(
            arrayMove(order, order.indexOf(active.id as Kind), order.indexOf(over.id as Kind)),
          );
        }}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <Group gap="sm" role="group" aria-labelledby="algorithm-selector-label">
            <Text size="sm" fw={500} id="algorithm-selector-label">
              {t('visible_algorithms')}
            </Text>
            {order.map((kind) => (
              <AlgorithmChip
                key={kind}
                kind={kind}
                checked={visible.includes(kind)}
                onToggle={() => onToggle(kind)}
              />
            ))}
          </Group>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

const AlgorithmChip: React.FC<{ kind: Kind; checked: boolean; onToggle: () => void }> = ({
  kind,
  checked,
  onToggle,
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: kind });
  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={t('reorder_algorithm', { name: t(kind) })}
          title={t('reorder_algorithm', { name: t(kind) })}
          style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="4" cy="9" r="1.5" />
            <circle cx="10" cy="9" r="1.5" />
            <circle cx="4" cy="14" r="1.5" />
            <circle cx="10" cy="14" r="1.5" />
          </svg>
        </ActionIcon>
        <Chip checked={checked} onChange={onToggle} variant="outline">
          {t(kind)}
        </Chip>
      </Group>
    </Box>
  );
};

export default AlgorithmSelector;
