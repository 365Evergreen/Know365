import React from 'react';
import { Stack, Text } from '@fluentui/react';

const Help: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Help & Support</Text>
    <Text>FAQs and guidance on using the site.</Text>
  </Stack>
);

export default Help;
