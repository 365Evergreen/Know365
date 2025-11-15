import React from 'react';
import { Stack, Text } from '@fluentui/react';

const Tags: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Tags & Topics</Text>
    <Text>Browse content by thematic tags.</Text>
  </Stack>
);

export default Tags;
