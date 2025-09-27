import React from 'react';
import { Accordion, Group, Text } from '@mantine/core';
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
  // i18n キー
  titleKey: Kind;
  stepsCount: number;
  board: BoardState;
  // アルゴリズム固有の凡例（必須）
  Legend: React.ComponentType;
  // アルゴリズム固有のオーバレイ（任意）
  Overlay?: React.ComponentType<{ board: BoardState }>;
};

const SortSection: React.FC<Props> = ({ value, titleKey, stepsCount, board, Legend, Overlay }) => {
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
        <Bars board={board} ariaLabel={t(`bars_aria_${titleKey}`)} Overlay={Overlay} />
        <Legend />
      </Accordion.Panel>
    </Accordion.Item>
  );
};

/* ============= 内部：Bars（共通） ============= */
const Bars: React.FC<{
  board: BoardState;
  ariaLabel: string;
  Overlay?: React.ComponentType<{ board: BoardState }>;
}> = ({ board, ariaLabel, Overlay }) => {
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
    <div className="bars" aria-label={ariaLabel}>
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
          <div key={i} className={classes} style={{ height: `${h}%` }} data-label={board.ids[i]} />
        );
      })}
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
