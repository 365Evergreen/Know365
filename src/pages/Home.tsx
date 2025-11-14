import React from 'react';
import { Stack } from '@fluentui/react';

const Home: React.FC = () => {
  return (
    <main aria-labelledby="home-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="home-heading">Knowledge Centre</h1>
        <p>Welcome — this is a scaffolded home page. Use the search or navigate to the Knowledge page to explore documents.</p>
      </Stack>
    </main>
  );
};

export default Home;
