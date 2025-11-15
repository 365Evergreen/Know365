import React from 'react';
import { Stack, Text } from '@fluentui/react';

const Contribute: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Contribute Knowledge</Text>
    <Text>Submit new knowledge items to the repository.</Text>
  </Stack>
);

export default Contribute;
