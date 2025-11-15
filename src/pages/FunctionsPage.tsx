import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Text, DefaultButton } from '@fluentui/react';

const readable = (s?: string) => (s || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const FunctionsPage: React.FC = () => {
  const params = useParams<{ fn?: string }>();
  const navigate = useNavigate();
  const fn = params.fn; // e.g. 'finance' or 'hr'

  const title = fn ? readable(fn) : 'Functions';

  return (
    <Stack styles={{ root: { padding: 24 } }} tokens={{ childrenGap: 12 }}>
      <Text variant="xLarge">{title}</Text>
      <Text>
        {fn
          ? `This page shows knowledge for the ${title} function. Use the filters or cards below to browse ${title} content.`
          : 'Select a function to view knowledge for that area.'}
      </Text>

      {/* Example quick links to switch functions using the same page */}
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 12 } }}>
        <DefaultButton onClick={() => navigate('/functions/operations')}>Operations</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/customer-service')}>Customer Service</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/finance')}>Finance</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/hr')}>Human Resources</DefaultButton>
      </Stack>

      {/* Placeholder for a component that would render filtered content (e.g., ArticlesList filter by function) */}
      <div style={{ marginTop: 20 }}>
        <Text>Filtered content component would appear here (e.g. ArticlesList filtered by function).</Text>
      </div>
    </Stack>
  );
};

export default FunctionsPage;
