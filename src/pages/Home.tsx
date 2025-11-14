import React from 'react';
import { Stack } from '@fluentui/react';
import useAuth from '../hooks/useAuth';

const Home: React.FC = () => {
  const auth = useAuth();
  const account = auth.getActiveAccount();
  const displayName = account?.name ?? (account as any)?.username ?? 'User';
  const firstName = (displayName && displayName.split ? displayName.split(' ')[0] : 'User') || 'User';

  return (
    <main aria-labelledby="home-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="home-heading">Knowledge Centre</h1>
        <h2 style={{ marginTop: 4 }}>Hello, {firstName}</h2>
        <p>Welcome — this is a scaffolded home page. Use the search or navigate to the Knowledge page to explore documents.</p>
      </Stack>
    </main>
  );
};

export default Home;
