import { handler } from './handler';
import { Connection, Client } from '@temporalio/client';

// Mock the Temporal client
jest.mock('@temporalio/client');

describe('Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should return 400 error when event body is missing event id', async () => {
      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                // Missing id field
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toBe('application/json');
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing event.data.new.id');
    });

    it('should return 400 error when body is empty', async () => {
      const event = {
        body: null,
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing event.data.new.id');
    });

    it('should return 500 error when body is invalid JSON', async () => {
      const event = {
        body: 'invalid json',
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(500);
    });

    it('should successfully start workflow with valid event', async () => {
      const mockWorkflowStart = jest.fn().mockResolvedValue(undefined);
      const mockClient = {
        workflow: {
          start: mockWorkflowStart,
        },
      };
      const mockConnect = jest.fn().mockResolvedValue({});

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-123',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.eventId).toBe('event-123');
      expect(body.workflowId).toContain('threat-');
    });

    it('should return 200 with workflowId matching pattern', async () => {
      const mockClient = {
        workflow: {
          start: jest.fn().mockResolvedValue(undefined),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'unique-event-id',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.workflowId).toBe('threat-unique-event-id');
    });

    it('should handle Temporal connection errors', async () => {
      (Connection.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-456',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Connection failed');
    });

    it('should handle workflow start errors', async () => {
      const mockClient = {
        workflow: {
          start: jest.fn().mockRejectedValue(new Error('Workflow error')),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-789',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Workflow error');
    });

    it('should use TEMPORAL_ADDRESS environment variable if set', async () => {
      const originalEnv = process.env.TEMPORAL_ADDRESS;
      process.env.TEMPORAL_ADDRESS = 'custom-host:7233';

      const mockClient = {
        workflow: {
          start: jest.fn().mockResolvedValue(undefined),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-env',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);

      expect(Connection.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          address: 'custom-host:7233',
        })
      );

      process.env.TEMPORAL_ADDRESS = originalEnv;
    });

    it('should use default TEMPORAL_ADDRESS if not set', async () => {
      delete process.env.TEMPORAL_ADDRESS;

      const mockClient = {
        workflow: {
          start: jest.fn().mockResolvedValue(undefined),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-default',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);

      expect(Connection.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.stringContaining(':7233'),
        })
      );
    });

    it('should pass correct taskQueue to workflow', async () => {
      const mockWorkflowStart = jest.fn().mockResolvedValue(undefined);
      const mockClient = {
        workflow: {
          start: mockWorkflowStart,
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'event-queue-test',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);

      expect(mockWorkflowStart).toHaveBeenCalledWith(
        'threatPipeline',
        expect.objectContaining({
          taskQueue: 'cyberguard',
        })
      );
    });

    it('should pass event ID as workflow argument', async () => {
      const mockWorkflowStart = jest.fn().mockResolvedValue(undefined);
      const mockClient = {
        workflow: {
          start: mockWorkflowStart,
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'test-event-arg',
              },
            },
          },
        }),
      } as any;

      await handler(event);

      expect(mockWorkflowStart).toHaveBeenCalledWith(
        'threatPipeline',
        expect.objectContaining({
          args: ['test-event-arg'],
        })
      );
    });

    it('should handle deeply nested event structure', async () => {
      const mockClient = {
        workflow: {
          start: jest.fn().mockResolvedValue(undefined),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'deep-nested-id',
                extra: 'data',
                nested: {
                  level: 2,
                },
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.eventId).toBe('deep-nested-id');
    });

    it('should handle response content-type header', async () => {
      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {},
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should return properly formatted error response', async () => {
      const event = {
        body: null,
      } as any;

      const result = await handler(event);
      const response = result as any;

      expect(response.statusCode).toBe(400);
      expect(response.headers).toHaveProperty('content-type', 'application/json');

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body).not.toHaveProperty('ok');
    });

    it('should return properly formatted success response', async () => {
      const mockClient = {
        workflow: {
          start: jest.fn().mockResolvedValue(undefined),
        },
      };

      (Connection.connect as jest.Mock).mockResolvedValue({});
      (Client as jest.Mock).mockImplementation(() => mockClient);

      const event = {
        body: JSON.stringify({
          event: {
            data: {
              new: {
                id: 'response-format-test',
              },
            },
          },
        }),
      } as any;

      const result = await handler(event);
      const response = result as any;

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('ok', true);
      expect(body).toHaveProperty('workflowId');
      expect(body).toHaveProperty('eventId');
      expect(body).not.toHaveProperty('error');
    });
  });
});
