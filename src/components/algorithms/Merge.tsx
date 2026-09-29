import React from 'react';
import { Group, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BoardState } from '@/components/SortSection';

export const MergeLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs" wrap="wrap">
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<span className="legend-box legend-swap" />}
      >
        {t('badge_merge_operations')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<span className="legend-box legend-boundary" />}
      >
        {t('badge_merge_range')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<span className="legend-box legend-sorted" />}
      >
        {t('badge_sorted')}
      </Badge>
    </Group>
  );
};

export const MergeOverlay: React.FC<{ board: BoardState }> = ({ board }) => {
  const n = Math.max(board.data.length, 1);
  const range = board.range;
  const leftPct = ((range?.lo ?? 0) / n) * 100;
  const rightPct = (((range?.hi ?? n - 1) + 1) / n) * 100;
  const boundaryPct = ((board.boundaryIndex ?? 0) / n) * 100;

  return (
    <div className="partition-overlay" aria-hidden="true">
      <div
        className="subrange"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          display: range ? 'block' : 'none',
        }}
      />
      <div
        className="boundary"
        style={{
          left: `${boundaryPct}%`,
          display: range && board.boundaryVisible ? 'block' : 'none',
        }}
      />
    </div>
  );
};
