// src/components/algorithms/Bubble.tsx
import React from 'react';
import { Group, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export const BubbleLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs">
      <Badge
        variant="transparent"
        color="gray"
        tt="none"
        fw={500}
        px={0}
        leftSection={<span className="legend-box legend-swap" />}
      >
        {t('badge_swap')}
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
