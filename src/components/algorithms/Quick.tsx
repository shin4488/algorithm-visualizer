import React from 'react';
import { Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import LegendItem from '@/components/LegendItem';
import type { BoardState } from '@/components/SortSection';

export const QuickLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs" wrap="wrap">
      <LegendItem color="var(--danger)">{t('badge_swap')}</LegendItem>
      <LegendItem color="var(--markL)">{t('badge_left_candidate')}</LegendItem>
      <LegendItem color="var(--markR)">{t('badge_right_candidate')}</LegendItem>
      <LegendItem color="var(--pivot)">{t('badge_pivot')}</LegendItem>
      <LegendItem color="var(--cyan)">{t('badge_boundary')}</LegendItem>
      <LegendItem color="var(--pivotLine)">{t('badge_pivotline')}</LegendItem>
      <LegendItem color="var(--accent2)">{t('badge_sorted')}</LegendItem>
    </Group>
  );
};

export const QuickOverlay: React.FC<{ board: BoardState }> = ({ board }) => {
  const n = Math.max(board.data.length, 1);
  const range = board.range;
  const lo = range?.lo ?? 0;
  const hi = range?.hi ?? n - 1;

  const showRange = range != null;
  const leftPct = (lo / n) * 100;
  const rightPct = ((hi + 1) / n) * 100;
  const boundaryPct = ((board.boundaryIndex ?? lo) / n) * 100;

  const pivotHeightPct =
    board.pivotIndex != null && board.data.length
      ? (board.data[board.pivotIndex] / board.maxValue) * 100
      : null;

  return (
    <div className="partition-overlay" aria-hidden="true">
      <div
        className="zone"
        style={{
          left: `${leftPct}%`,
          right: `${100 - boundaryPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="zone"
        style={{
          left: `${boundaryPct}%`,
          right: `${100 - rightPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="subrange"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          display: showRange ? 'block' : 'none',
        }}
      />
      <div
        className="boundary"
        style={{
          left: `${boundaryPct}%`,
          display: showRange && board.boundaryVisible ? 'block' : 'none',
        }}
      />
      <div
        className="pivot-hline"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          bottom: pivotHeightPct != null ? `${pivotHeightPct}%` : undefined,
          display: showRange && pivotHeightPct != null ? 'block' : 'none',
        }}
      />
    </div>
  );
};
