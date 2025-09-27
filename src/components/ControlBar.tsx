import React from 'react';
import { Group, Text, ActionIcon, Slider, Button, Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';

type Props = {
  size: number;
  speed: number;
  playing: boolean;
  onSizeChange: (n: number) => void;
  onSpeedChange: (s: number) => void;
  onStart: () => void;
  onPause: () => void;
  onShuffle: () => void;
};

const ControlBar: React.FC<Props> = ({
  size,
  speed,
  playing,
  onSizeChange,
  onSpeedChange,
  onStart,
  onPause,
  onShuffle,
}) => {
  const { t } = useTranslation();

  return (
    <Group wrap="wrap" gap="md" align="center">
      {/* 本数 */}
      <Group
        gap="xs"
        align="center"
        style={{
          padding: '1px 1px',
          background: '#0c1530',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Text size="xs" c="var(--muted)">
          {t('count_label')} {size}
        </Text>
        <Group gap="xs" align="center">
          <ActionIcon
            variant="default"
            aria-label={t('count_dec_aria')}
            onClick={() => onSizeChange(size - 1)}
            style={stepperBtnStyle}
          >
            −
          </ActionIcon>
          <Slider
            value={size}
            onChange={onSizeChange}
            min={5}
            max={50}
            step={1}
            w={220}
            styles={{
              root: {
                paddingTop: 8,
                paddingBottom: 8,
                background: '#0f1b3a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
              },
              thumb: { borderColor: 'var(--accent)', background: 'var(--accent)' },
            }}
          />
          <ActionIcon
            variant="default"
            aria-label={t('count_inc_aria')}
            onClick={() => onSizeChange(size + 1)}
            style={stepperBtnStyle}
          >
            ＋
          </ActionIcon>
        </Group>
      </Group>

      {/* 速度 */}
      <Group
        gap="xs"
        align="center"
        style={{
          padding: '1px 1px',
          background: '#0c1530',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Text size="xs" c="var(--muted)">
          {t('speed_label')} {speed.toFixed(2)}
        </Text>
        <Group gap="xs" align="center">
          <ActionIcon
            variant="default"
            aria-label={t('speed_down_aria')}
            onClick={() => onSpeedChange(Number((speed - 0.05).toFixed(2)))}
            style={stepperBtnStyle}
          >
            −
          </ActionIcon>
          <Slider
            value={speed}
            onChange={onSpeedChange}
            min={0.2}
            max={10}
            step={0.05}
            w={220}
            styles={{
              root: {
                paddingTop: 8,
                paddingBottom: 8,
                background: '#0f1b3a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
              },
              thumb: { borderColor: 'var(--accent)', background: 'var(--accent)' },
            }}
          />
          <ActionIcon
            variant="default"
            aria-label={t('speed_up_aria')}
            onClick={() => onSpeedChange(Number((speed + 0.05).toFixed(2)))}
            style={stepperBtnStyle}
          >
            ＋
          </ActionIcon>
        </Group>
      </Group>

      {/* 右寄せ：操作ボタン */}
      <Box style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
        <Group gap="sm" align="center" wrap="nowrap">
          <Button
            onClick={onStart}
            disabled={playing}
            style={primaryBtnStyle}
            leftSection={<span style={{ fontWeight: 700 }}>▶</span>}
          >
            {t('play')}
          </Button>

          <Button
            variant="default"
            onClick={onPause}
            disabled={!playing}
            leftSection={<span style={{ fontWeight: 700 }}>⏸</span>}
            styles={{ root: pauseBtnStyle }}
          >
            {t('pause')}
          </Button>

          <Button variant="default" onClick={onShuffle} style={ghostBtnStyle}>
            {t('shuffle')}
          </Button>
        </Group>
      </Box>
    </Group>
  );
};

/* ---- 局所スタイル ---- */
const stepperBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'linear-gradient(180deg, #1a2552 0%, #131d40 100%)',
  color: '#e6ebff',
  fontWeight: 700,
  lineHeight: 1,
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #2854ff 0%, #1d36a8 100%)',
  border: '1px solid #4062ff',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
};

const pauseBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  color: 'var(--text)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1a2552 0%, #131d40 100%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 600,
};

export default ControlBar;
