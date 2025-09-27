import React from 'react';
import { Group, Stack, Title, Text, Anchor } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const HeaderBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs" gap={3}>
      <Stack gap="xs" mb="xs">
        <Anchor href="/" underline="never">
          <Title
            order={1}
            style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(20px, 2.4vw, 28px)' }}
          >
            {t('app_title')}
          </Title>
        </Anchor>
        <Text c="var(--muted)" size="sm">
          {t('app_desc')}
        </Text>
      </Stack>

      {/* 右上：言語切替（既存コンポーネントをそのまま使用） */}
      <Stack flex="auto" align="flex-end">
        <LanguageSwitcher />
      </Stack>
    </Group>
  );
};

export default HeaderBar;
