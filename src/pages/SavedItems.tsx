import React from 'react';
import { Stack, Text } from '@fluentui/react';

const SavedItems: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Saved Items</Text>
    <Text>Your saved knowledge items.</Text>
  </Stack>
);

export default SavedItems;
