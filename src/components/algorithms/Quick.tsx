import React from 'react';
import { Group, Badge, ColorSwatch } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BoardState } from '@/components/SortSection';

export const QuickLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs" wrap="wrap">
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--danger)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_swap')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--markL)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_left_candidate')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--markR)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_right_candidate')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--pivot)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_pivot')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--cyan)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_boundary')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={
          <ColorSwatch color="var(--pivotLine)" size={8} radius={2} withShadow={false} />
        }
      >
        {t('badge_pivotline')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--accent2)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_sorted')}
      </Badge>
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
      ? (board.data[board.pivotIndex] / Math.max(...board.data, 1)) * 100
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
