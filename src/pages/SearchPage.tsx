import React from 'react';
import { Stack, Text } from '@fluentui/react';

const SearchPage: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Search</Text>
    <Text>Advanced search with filters.</Text>
  </Stack>
);

export default SearchPage;
