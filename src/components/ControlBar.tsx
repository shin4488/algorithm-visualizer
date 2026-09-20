import React from 'react';
import { Group, Text, ActionIcon, Slider, Button, Paper, SimpleGrid, Box } from '@mantine/core';
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
    <Paper withBorder p={{ base: 'md', sm: 'lg' }} radius="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
        <Box>
          <Text id="count-label" c="dimmed" size="xs" fw={600} mb="sm">
            {t('count_label')} {size}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="default"
              aria-label={t('count_dec_aria')}
              onClick={() => onSizeChange(size - 1)}
              size={28}
              miw={28}
            >
              −
            </ActionIcon>
            <Slider
              value={size}
              onChange={onSizeChange}
              min={5}
              max={50}
              step={1}
              thumbLabel={t('count_label')}
              flex={1}
              thumbSize={14}
            />
            <ActionIcon
              variant="default"
              aria-label={t('count_inc_aria')}
              onClick={() => onSizeChange(size + 1)}
              size={28}
              miw={28}
            >
              ＋
            </ActionIcon>
          </Group>
        </Box>
        <Box>
          <Text id="speed-label" c="dimmed" size="xs" fw={600} mb="sm">
            {t('speed_label')} {speed.toFixed(2)}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="default"
              aria-label={t('speed_down_aria')}
              onClick={() => onSpeedChange(Number((speed - 0.05).toFixed(2)))}
              size={28}
              miw={28}
            >
              −
            </ActionIcon>
            <Slider
              value={speed}
              onChange={onSpeedChange}
              min={0.2}
              max={10}
              step={0.05}
              thumbLabel={t('speed_label')}
              flex={1}
              thumbSize={14}
            />
            <ActionIcon
              variant="default"
              aria-label={t('speed_up_aria')}
              onClick={() => onSpeedChange(Number((speed + 0.05).toFixed(2)))}
              size={28}
              miw={28}
            >
              ＋
            </ActionIcon>
          </Group>
        </Box>
        <Group gap="xs" wrap="nowrap" align="center">
          <Button
            px="sm"
            autoContrast
            onClick={onStart}
            disabled={playing}
            leftSection={<span aria-hidden="true">▶</span>}
          >
            {t('play')}
          </Button>
          <Button
            px="sm"
            variant="default"
            onClick={onPause}
            disabled={!playing}
            leftSection={<span aria-hidden="true">Ⅱ</span>}
          >
            {t('pause')}
          </Button>
          <Button px="sm" variant="default" onClick={onShuffle}>
            {t('shuffle')}
          </Button>
        </Group>
      </SimpleGrid>
    </Paper>
  );
};

export default ControlBar;
