import React from 'react';
import Hero from '../components/Hero';
import { Stack } from '@fluentui/react';

const Home: React.FC = () => {
  return (
    <main aria-labelledby="home-heading">
      <Hero />
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h2>Quick links</h2>
        <p>Use the search box above or navigate to the Knowledge page to explore documents and sources.</p>
      </Stack>
    </main>
  );
};

export default Home;
