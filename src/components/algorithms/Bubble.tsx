import React from 'react';
import { Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import LegendItem from '@/components/LegendItem';

export const BubbleLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs">
      <LegendItem color="var(--danger)">{t('badge_swap')}</LegendItem>
      <LegendItem color="var(--accent2)">{t('badge_sorted')}</LegendItem>
    </Group>
  );
};
