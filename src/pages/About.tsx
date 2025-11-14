import React from 'react';
import { Stack } from '@fluentui/react';

const About: React.FC = () => {
  return (
    <main aria-labelledby="about-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="about-heading">About</h1>
        <p>This Knowledge Centre is built with React, Vite and Fluent UI. It integrates with Microsoft Graph and Dataverse to surface organizational knowledge.</p>
        <p>UI inspired by Microsoft documentation patterns: clear headings, descriptive lead paragraphs, and a simple stacked layout.</p>
      </Stack>
    </main>
  );
};

export default About;
