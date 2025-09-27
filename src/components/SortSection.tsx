import React from 'react';
import { Accordion, Group, Text, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { Step } from '../plugins/visualizer';

export type Kind = 'bubble' | 'quick';
export type Range = { lo: number; hi: number } | null;

export type BoardState = {
  kind: Kind;
  data: number[];
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
};

type Props = {
  value: Kind;
  titleKey: Kind;
  stepsCount: number;
  board: BoardState;
};

const SortSection: React.FC<Props> = ({ value, titleKey, stepsCount, board }) => {
  const { t } = useTranslation();

  return (
    <Accordion.Item value={value} style={boardStyle}>
      <Accordion.Control style={boardSummaryStyle}>
        <Group justify="space-between" w="100%">
          <Group gap={10} align="center">
            <Text style={{ margin: 0, fontSize: 16, color: '#cbd5ff', fontWeight: 600 }}>
              {t(titleKey)}
            </Text>
          </Group>
          <Text size="xs" c="#cbd5ff">
            {t('steps', { n: stepsCount })}
          </Text>
        </Group>
      </Accordion.Control>

      <Accordion.Panel>
        <Bars board={board} />

        {/* 凡例（アルゴリズム別） */}
        {board.kind === 'bubble' ? (
          <Group gap="xs" mt="xs">
            <Badge variant="light" leftSection={<span className="legend-box legend-swap" />}>
              {t('badge_swap')}
            </Badge>
            <Badge variant="light" leftSection={<span className="legend-box legend-sorted" />}>
              {t('badge_sorted')}
            </Badge>
          </Group>
        ) : (
          <Group gap="xs" mt="xs" wrap="wrap">
            <Badge variant="light" leftSection={<span className="legend-box legend-swap" />}>
              {t('badge_swap')}
            </Badge>
            <Badge variant="light" leftSection={<span className="legend-box legend-pivot" />}>
              {t('badge_pivot')}
            </Badge>
            <Badge variant="light" leftSection={<span className="legend-box legend-boundary" />}>
              {t('badge_boundary')}
            </Badge>
            <Badge variant="light" leftSection={<span className="legend-box legend-pivotline" />}>
              {t('badge_pivotline')}
            </Badge>
            <Badge variant="light" leftSection={<span className="legend-box legend-sorted" />}>
              {t('badge_sorted')}
            </Badge>
          </Group>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
};

/* ============= 内部：Bars / QuickOverlay ============= */

const Bars: React.FC<{ board: BoardState }> = ({ board }) => {
  const { t } = useTranslation();
  const max = Math.max(...board.data, 1);
  const n = board.data.length;

  const isCompare = (idx: number) =>
    !!board.compare && (idx === board.compare[0] || idx === board.compare[1]);
  const isSwap = (idx: number) =>
    !!board.swapPair && (idx === board.swapPair[0] || idx === board.swapPair[1]);
  const isPivot = (idx: number) => board.pivotIndex === idx;
  const isCandL = (idx: number) => board.candL === idx;
  const isCandR = (idx: number) => board.candR === idx;

  return (
    <div
      className="bars"
      aria-label={board.kind === 'bubble' ? t('bars_aria_bubble') : t('bars_aria_quick')}
    >
      {board.kind === 'quick' && <QuickOverlay board={board} />}

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
          <div key={i} className={classes} style={{ height: `${h}%` }} data-label={board.ids[i]} />
        );
      })}
    </div>
  );
};

const QuickOverlay: React.FC<{ board: BoardState }> = ({ board }) => {
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

/* ---- 見た目（セクション外枠） ---- */
const boardStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 0,
  borderRadius: 14,
  background: '#0a1330',
  border: '1px dashed rgba(255, 255, 255, 0.08)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
};

const boardSummaryStyle: React.CSSProperties = {
  padding: '12px 14px',
};

export default SortSection;
