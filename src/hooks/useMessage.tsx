import React, { useRef, useState, useCallback } from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';

// Simple message hook and host component for app-wide notifications
export const useMessage = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<MessageBarType>(MessageBarType.info);
  const timerRef = useRef<number | null>(null);

  const showMessage = useCallback((text: string, t: MessageBarType = MessageBarType.info, duration = 4000) => {
    setMessage(text);
    setType(t);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(null), duration) as unknown as number;
  }, []);

  const MessageHost: React.FC = () => (
    <>{message ? <div style={{ margin: '8px 0' }}><MessageBar messageBarType={type} onDismiss={() => setMessage(null)}>{message}</MessageBar></div> : null}</>
  );

  return { showMessage, MessageHost } as const;
};

export default useMessage;
