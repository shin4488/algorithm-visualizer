import React from 'react';
import { Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import i18n from '../plugins/i18n';

const LanguageSwitcher: React.FC = () => {
  const { i18n: inst, t } = useTranslation();
  const value = inst.language?.startsWith('ja') ? 'ja' : 'en';

  const onChange = (value: string | null) => {
    if (value !== 'ja' && value !== 'en') return;
    // Promise を無視して良いので void を付与（no-floating-promises 回避）
    void i18n.changeLanguage(value);

    // URL も言語ごとのエントリへ移動（クエリ/ハッシュは温存）
    const { origin, search, hash } = window.location;
    window.location.assign(`${origin}/${value}/${search}${hash}`);
  };

  return (
    <Select
      label={t('language_setting_label')}
      aria-label="Language"
      value={value}
      onChange={onChange}
      data={[
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
      ]}
      w={90}
      size="xs"
      styles={{ input: { background: '#0f1b3a', borderColor: 'rgba(255,255,255,0.18)' } }}
    />
  );
};

export default LanguageSwitcher;
