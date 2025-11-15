import React from 'react';
import { Stack, Text } from '@fluentui/react';

const MyContributions: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">My Contributions</Text>
    <Text>List of knowledge items you've submitted.</Text>
  </Stack>
);

export default MyContributions;
