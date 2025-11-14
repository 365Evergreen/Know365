import React from 'react';
import Hero from '../components/Hero';
import { Stack } from '@fluentui/react';
import GridCards from '../components/GridCards';

const Home: React.FC = () => {
  return (
    <main aria-labelledby="home-heading">
      <Hero />
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h2>Quick links</h2>
        <p>Use the search box above or navigate to the Knowledge page to explore documents and sources.</p>
        <section aria-labelledby="discover-heading">
          <h3 id="discover-heading">Discover</h3>
          <GridCards />
        </section>
      </Stack>
    </main>
  );
};

export default Home;
