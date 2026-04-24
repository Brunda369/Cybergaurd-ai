# my-app Lambda Handler Tests

## Overview
Jest test suite for the AWS Lambda handler that orchestrates Temporal workflow execution for threat detection and enrichment.

## Test File
- **Location:** [src/handler.test.ts](src/handler.test.ts)
- **Test Cases:** 15
- **Status:** ✅ All passing

## Test Coverage

### Event Validation Tests
- ✅ Missing event ID in Hasura payload
- ✅ Empty request body
- ✅ Invalid JSON in request body

### Success Path Tests
- ✅ Successful workflow start with valid event
- ✅ Correct workflowId generation pattern (threat-{eventId})
- ✅ Properly formatted success response

### Error Handling Tests
- ✅ Temporal connection failures
- ✅ Workflow start errors
- ✅ Error response formatting

### Configuration Tests
- ✅ Custom TEMPORAL_ADDRESS environment variable
- ✅ Default TEMPORAL_ADDRESS fallback
- ✅ Task queue configuration ('cyberguard')
- ✅ Workflow argument passing

### Edge Cases
- ✅ Deeply nested event structure
- ✅ Response content-type header validation
- ✅ Error vs success response distinction

## Running Tests

```bash
cd my-app

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Project Structure

```
my-app/
├── src/
│   ├── handler.ts           # Lambda handler implementation
│   └── handler.test.ts      # Test cases (15 tests)
├── jest.config.js           # Jest configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Dependencies

The following dev dependencies were added for testing:

```json
{
  "jest": "^29.7.0",
  "ts-jest": "^29.1.1",
  "@types/jest": "^29.5.11"
}
```

## Test Examples

### Test: Valid Event Workflow Start
```typescript
it('should successfully start workflow with valid event', async () => {
  const mockClient = { workflow: { start: jest.fn() } };
  (Connection.connect as jest.Mock).mockResolvedValue({});
  (Client as jest.Mock).mockImplementation(() => mockClient);

  const event = {
    body: JSON.stringify({
      event: { data: { new: { id: 'event-123' } } }
    })
  };

  const result = await handler(event);
  const response = result as any;

  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.ok).toBe(true);
  expect(body.eventId).toBe('event-123');
});
```

### Test: Missing Event ID
```typescript
it('should return 400 error when event body is missing event id', async () => {
  const event = {
    body: JSON.stringify({
      event: { data: { new: {} } }
    })
  };

  const result = await handler(event);
  const response = result as any;

  expect(response.statusCode).toBe(400);
  const body = JSON.parse(response.body);
  expect(body.error).toContain('Missing event.data.new.id');
});
```

## Handler Behavior

The Lambda handler:
1. Parses the incoming event body as JSON
2. Extracts the event ID from `event.data.new.id`
3. Returns 400 if the ID is missing
4. Connects to the Temporal workflow service
5. Starts the `threatPipeline` workflow with:
   - WorkflowId: `threat-{eventId}`
   - TaskQueue: `cyberguard`
   - Arguments: `[eventId]`
6. Returns 200 with workflow info on success
7. Returns 500 with error details on failure

## Mocking Strategy

Tests mock the Temporal client to avoid actual workflow execution:

```typescript
jest.mock('@temporalio/client');

(Connection.connect as jest.Mock).mockResolvedValue({});
(Client as jest.Mock).mockImplementation(() => mockClient);
```

This allows testing the handler logic without connecting to a real Temporal server.

## Environment Variables

The handler respects the following environment variable:

```env
TEMPORAL_ADDRESS=localhost:7233  # Default if not set
```

Tests verify both the custom value and the default fallback.

## Integration Notes

- The handler expects Hasura events in the standard webhook format
- The Temporal server must be running for production use
- The `threatPipeline` workflow must be registered in the Temporal cluster
- The task queue `cyberguard` should have workers listening for tasks

## Next Steps

To extend test coverage:
1. Add tests for custom event structures
2. Test timeout scenarios
3. Add performance/load tests
4. Test with different Hasura event schemas
5. Add integration tests with real Temporal server

---

**Test Framework:** Jest 29.7.0  
**TypeScript Support:** ts-jest 29.1.1  
**Last Updated:** February 4, 2026
