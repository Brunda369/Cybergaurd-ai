import { useState } from 'react';

const SAM_TRIGGER_URL = import.meta.env.VITE_SAM_TRIGGER_URL || 'http://127.0.0.1:3000/trigger-workflow';

interface TriggerWorkflowParams {
  eventId: string;
}

export const useTriggerWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerWorkflow = async (params: TriggerWorkflowParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(SAM_TRIGGER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { triggerWorkflow, loading, error };
};