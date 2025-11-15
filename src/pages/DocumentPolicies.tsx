import React from 'react';
import { Stack, Text } from '@fluentui/react';

const DocumentPolicies: React.FC = () => (
  <Stack styles={{ root: { padding: 24 } }}>
    <Text variant="xLarge">Policies</Text>
    <Text>Company policies and governance documents.</Text>
  </Stack>
);

export default DocumentPolicies;
