import React from 'react';
import { Stack, Text } from '@fluentui/react';

const MyKnowledge: React.FC = () => {
  return (
    <Stack styles={{ root: { padding: 24 } }}>
      <Text variant="xLarge">My Knowledge</Text>
      <Text>Overview of your contributions, saved items and recently viewed content.</Text>
    </Stack>
  );
};

export default MyKnowledge;
