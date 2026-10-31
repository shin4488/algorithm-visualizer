import React from 'react';
import { Badge, ColorSwatch } from '@mantine/core';

const LegendItem: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => (
  <Badge
    variant="transparent"
    color="gray"
    tt="none"
    fw={500}
    px={0}
    leftSection={<ColorSwatch color={color} size={8} radius={2} withShadow={false} />}
  >
    {children}
  </Badge>
);

export default LegendItem;
