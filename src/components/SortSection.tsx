import React from 'react';
import { Paper, Group, Text, Box, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Step } from '@/plugins/visualizer';
import { MergeGuide } from '@/components/algorithms/Merge';

export type Kind = 'bubble' | 'selection' | 'merge' | 'quick';
export type Range = { lo: number; hi: number } | null;
export type MergeProgress = {
  left: number[];
  right: number[];
  leftCursor: number;
  rightCursor: number;
  output: number[];
  selected: { side: 'left' | 'right'; value: number } | null;
  writing: boolean;
};

export type BoardState = {
  kind: Kind;
  data: number[];
  maxValue: number;
  ids: number[];
  steps: Step[];
  stepIndex: number;
  finished: boolean;
  compare?: [number, number] | null;
  swapPair?: [number, number] | null;
  candL?: number | null;
  candR?: number | null;
  pivotIndex: number | null;
  range: Range;
  boundaryIndex: number | null;
  boundaryVisible: boolean;
  mergeProgress: MergeProgress | null;
};

type Props = {
  // i18n キー
  titleKey: Kind;
  stepsCount: number;
  board: BoardState;
  // アルゴリズム固有の凡例（必須）
  Legend: React.ComponentType;
  // アルゴリズム固有のオーバレイ（任意）
  Overlay?: React.ComponentType<{ board: BoardState }>;
};

const SortSection: React.FC<Props> = ({ titleKey, stepsCount, board, Legend, Overlay }) => {
  const { t } = useTranslation();

  return (
    <Paper component="section" aria-labelledby={`${titleKey}-title`} withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Title order={2} id={`${titleKey}-title`} size="sm" fw={650}>
          {t(titleKey)}
        </Title>
        <Text c="dimmed" size="xs">
          {t('steps', { n: stepsCount })}
        </Text>
      </Group>
      <Box style={{ overflowX: 'auto' }} pt="sm">
        <Bars board={board} ariaLabel={t(`bars_aria_${titleKey}`)} Overlay={Overlay} />
      </Box>
      {board.kind === 'merge' && <MergeGuide board={board} />}
      <Legend />
    </Paper>
  );
};

/* ============= 内部：Bars（共通） ============= */
const Bars: React.FC<{
  board: BoardState;
  ariaLabel: string;
  Overlay?: React.ComponentType<{ board: BoardState }>;
}> = ({ board, ariaLabel, Overlay }) => {
  const max = board.maxValue;
  const n = board.data.length;

  const isCompare = (idx: number) =>
    !board.finished && !!board.compare && (idx === board.compare[0] || idx === board.compare[1]);
  const isSwap = (idx: number) =>
    !!board.swapPair && (idx === board.swapPair[0] || idx === board.swapPair[1]);
  const isPivot = (idx: number) => board.pivotIndex === idx;
  const isCandL = (idx: number) => board.candL === idx;
  const isCandR = (idx: number) => board.candR === idx;

  return (
    // 番号が重ならない最小幅を確保し、狭い画面では親要素内でスクロールする。
    <div className="bars" style={{ minWidth: n * 12 + 24 }} aria-label={ariaLabel}>
      {Overlay ? <Overlay board={board} /> : null}

      {Array.from({ length: n }, (_, i) => {
        const h = (board.data[i] / max) * 100;
        const classes = [
          'bar',
          isPivot(i) ? 'pivot' : '',
          isCompare(i) ? 'compare' : '',
          isSwap(i) ? 'swap' : '',
          isCandL(i) ? 'candL' : '',
          isCandR(i) ? 'candR' : '',
          board.finished ? 'sorted' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={i} className={classes} style={{ height: `${h}%` }} data-label={board.data[i]} />
        );
      })}
    </div>
  );
};

export default SortSection;
