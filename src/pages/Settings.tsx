import React from 'react';
import { Stack, PrimaryButton } from '@fluentui/react';

const Settings: React.FC = () => {
  return (
    <main aria-labelledby="settings-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="settings-heading">Settings</h1>
        <p>Toggle preferences and manage your account settings here.</p>
        <PrimaryButton disabled>Manage account (placeholder)</PrimaryButton>
      </Stack>
    </main>
  );
};

export default Settings;
