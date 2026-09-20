import React from 'react';
import {
  Title,
  Text,
  Anchor,
  Group,
  Stack,
  Box,
  Divider,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const HeaderBar: React.FC = () => {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();
  const dark = useComputedColorScheme('light') === 'dark';
  return (
    <Box component="header">
      <Group justify="space-between" py="lg" gap="sm">
        <Anchor href="/" underline="never" c="var(--mantine-color-text)" fw={650} size="sm">
          Algorithm Visualizer
        </Anchor>
        <Group gap="sm" align="flex-end" wrap="nowrap">
          <ActionIcon
            variant="default"
            size={30}
            aria-label={t(dark ? 'light_mode' : 'dark_mode')}
            title={t(dark ? 'light_mode' : 'dark_mode')}
            onClick={() => setColorScheme(dark ? 'light' : 'dark')}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              {dark ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                </>
              ) : (
                <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
              )}
            </svg>
          </ActionIcon>
          <LanguageSwitcher />
        </Group>
      </Group>
      <Divider />
      <Stack gap="sm" py={{ base: 'xl', sm: 36 }}>
        <Title order={1} size="h2" fw={650}>
          {t('app_title')}
        </Title>
        <Text c="dimmed" size="sm" lh={1.8}>
          {t('app_desc')}
        </Text>
      </Stack>
    </Box>
  );
};
export default HeaderBar;
