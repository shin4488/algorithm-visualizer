// src/components/algorithms/Selection.tsx
import React from 'react';
import { Group, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export const SelectionLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs">
      <Badge variant="light" leftSection={<span className="legend-box legend-swap" />}>
        {t('badge_swap')}
      </Badge>
      <Badge variant="light" leftSection={<span className="legend-box legend-min" />}>
        {t('badge_min')}
      </Badge>
      <Badge variant="light" leftSection={<span className="legend-box legend-sorted" />}>
        {t('badge_sorted')}
      </Badge>
    </Group>
  );
};
