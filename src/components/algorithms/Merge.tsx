import React from 'react';
import { Group, Badge, Box, Code, Stack, Text, ColorSwatch } from '@mantine/core';
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
        leftSection={<ColorSwatch color="var(--danger)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_merge_operations')}
      </Badge>
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<ColorSwatch color="var(--cyan)" size={8} radius={2} withShadow={false} />}
      >
        {t('badge_merge_range')}
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

export const MergeGuide: React.FC<{ board: BoardState }> = ({ board }) => {
  const { t } = useTranslation();
  const progress = board.mergeProgress;
  const message = board.finished
    ? t('merge_finished')
    : progress?.writing
      ? t('merge_writing')
      : progress?.selected
        ? t('merge_choice', {
            side: t(`merge_${progress.selected.side}`),
            value: progress.selected.value,
          })
        : progress
          ? t('merge_comparing')
          : board.range
            ? t('merge_splitting')
            : t('merge_ready');

  const rows = progress
    ? [
        { key: 'merge_left_remaining', values: progress.left.slice(progress.leftCursor) },
        { key: 'merge_right_remaining', values: progress.right.slice(progress.rightCursor) },
        { key: 'merge_output', values: progress.output },
      ]
    : [];

  return (
    <Stack gap={4} mt="xs">
      <Text size="sm">{message}</Text>
      {rows.map(({ key, values }) => (
        <Box key={key} style={{ overflowX: 'auto' }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600} style={{ flexShrink: 0 }}>
              {t(key)}:
            </Text>
            <Code>{`[${values.join(', ')}]`}</Code>
          </Group>
        </Box>
      ))}
    </Stack>
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
