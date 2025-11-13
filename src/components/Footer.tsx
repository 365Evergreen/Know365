import React from 'react';
import { Stack, Link, Text } from '@fluentui/react';

const Footer: React.FC = () => (
  <Stack
    horizontal
    horizontalAlign="center"
    tokens={{ childrenGap: 20 }}
    styles={{
      root: {
        padding: '1.5rem',
        borderTop: '1px solid #edebe9',
        marginTop: 'auto',
      },
    }}
  >
    <Text variant="small">© 2025 Knowledge Centre</Text>
    <Link href="#privacy" styles={{ root: { fontSize: '14px' } }}>
      Privacy
    </Link>
    <Link href="#terms" styles={{ root: { fontSize: '14px' } }}>
      Terms
    </Link>
    <Link href="#support" styles={{ root: { fontSize: '14px' } }}>
      Support
    </Link>
  </Stack>
);

export default Footer;
