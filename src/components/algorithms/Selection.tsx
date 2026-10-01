import React from 'react';
import { Group, Badge, ColorSwatch } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export const SelectionLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Group gap="xs" mt="xs">
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
        {t('badge_min')}
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
