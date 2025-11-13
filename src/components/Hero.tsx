import React from 'react';
import { Stack, Text } from '@fluentui/react';

const Hero: React.FC = () => (
  <Stack
    horizontalAlign="center"
    verticalAlign="center"
    styles={{
      root: {
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      },
    }}
  >
    <Text
      variant="xxLarge"
      block
      styles={{ root: { fontWeight: 600, marginBottom: '1rem' } }}
    >
      Welcome to the Knowledge Centre
    </Text>
    <Text variant="large" block styles={{ root: { maxWidth: 600 } }}>
      Discover resources, guides, and best practices from across your Microsoft 365 environment.
      Search SharePoint, OneDrive, and Teams content all in one place.
    </Text>
  </Stack>
);

export default Hero;
