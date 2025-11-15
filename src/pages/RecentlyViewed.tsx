import React from 'react';
import { Stack, Text } from '@fluentui/react';

const RecentlyViewed: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Recently Viewed</Text>
    <Text>Items you've recently opened.</Text>
  </Stack>
);

export default RecentlyViewed;
