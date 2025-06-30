# WebSocket Authentication Implementation

## Overview

The WebSocket authentication system provides secure, JWT-based authentication for WebSocket connections in the IDB Back 2.0 application. It integrates seamlessly with the existing REST API authentication system, using the same JWT tokens and user management.

## Quick Start for Development

### Creating a Test User

For development and testing purposes, use the included script to create a test user:

```bash
# Using npm script (recommended)
npm run create-test-user

# Or directly
node scripts/create-test-user.js
```

This creates a test user with credentials:
- **Username**: `testuser`
- **Password**: `password123`
- **Role**: `user`

### Testing WebSocket Authentication

1. **Get JWT Token**:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"password123"}'
   ```

2. **Connect via WebSocket** (in Postman or your client):
   ```
   ws://localhost:3001/?token=YOUR_JWT_TOKEN_HERE
   ```

3. **Send Test Commands**:
   ```json
   {"action": "SYNC_PREVIEWS"}
   ```

### Development Scripts

- `npm run create-test-user` - Create/check test user for authentication testing
- `npm run check-users` - View all users in the database

## Architecture

### Components

1. **WsJwtAuthGuard** - Main authentication guard that validates JWT tokens for WebSocket connections
2. **AuthenticatedWebSocket** - Extended WebSocket interface that includes user information
3. **FilesDataWSGateway** - Updated gateway with authentication support
4. **WebSocket Decorators** - Helper decorators for accessing user information

### Key Features

- **JWT Token Validation** - Supports both query parameter and header-based token authentication
- **Token Blacklist Support** - Respects blacklisted tokens from the logout functionality
- **User Context** - Attaches authenticated user information to WebSocket connections
- **Connection Management** - Tracks authenticated clients and handles disconnections
- **Error Handling** - Proper error responses for authentication failures

## Authentication Methods

### 1. Query Parameter Authentication

Connect to WebSocket with JWT token as query parameter:

```javascript
const token = 'your-jwt-access-token';
const ws = new WebSocket(`ws://localhost:3001/?token=${token}`);
```

### 2. Header Authentication

Connect to WebSocket with JWT token in Authorization header:

```javascript
const token = 'your-jwt-access-token';
const ws = new WebSocket('ws://localhost:3001/', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Client Implementation Examples

### JavaScript/TypeScript Client

```typescript
interface WebSocketMessage {
  action: string;
  data?: any;
}

interface WebSocketResponse {
  action: string;
  data: {
    status: string;
    message: string;
    data?: any;
    progress?: number;
  };
}

class AuthenticatedWebSocketClient {
  private ws: WebSocket;
  private token: string;

  constructor(token: string, url: string = 'ws://localhost:3001') {
    this.token = token;
    this.connect(url);
  }

  private connect(url: string) {
    // Use query parameter authentication
    this.ws = new WebSocket(`${url}/?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const response: WebSocketResponse = JSON.parse(event.data);
      this.handleMessage(response);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (event.code === 1008) {
        console.error('Authentication failed');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(response: WebSocketResponse) {
    switch (response.data.status) {
      case 'ready':
        console.log('Connected successfully:', response.data.message);
        break;
      case 'error':
        console.error('Error:', response.data.message);
        break;
      case 'done':
        console.log('Process completed:', response.data.message);
        break;
      default:
        console.log('Status update:', response);
    }
  }

  public sendMessage(action: string, data?: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { action, data };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  public syncPreviews() {
    this.sendMessage('SYNC_PREVIEWS');
  }

  public createPreviews(folderPath: string = '', mimeTypes: string[] = []) {
    this.sendMessage('CREATE_PREVIEWS', { folderPath, mimeTypes });
  }

  public stopCreatePreviews() {
    this.sendMessage('CREATE_PREVIEWS_STOP');
  }

  public updateExif(folderPath: string = '', mimeTypes: string[] = []) {
    this.sendMessage('UPDATE_EXIF', { folderPath, mimeTypes });
  }

  public stopUpdateExif() {
    this.sendMessage('UPDATE_EXIF_STOP');
  }

  public close() {
    this.ws.close();
  }
}

// Usage example
const client = new AuthenticatedWebSocketClient('your-jwt-token');
client.syncPreviews();
```

### React Hook Example

```typescript
import { useEffect, useState, useRef } from 'react';

interface UseWebSocketOptions {
  token: string;
  url?: string;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export const useAuthenticatedWebSocket = ({
  token,
  url = 'ws://localhost:3001',
  onMessage,
  onError
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${url}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (event.code === 1008) {
        setError('Authentication failed');
      }
    };

    ws.onerror = (error) => {
      setError('Connection error');
      onError?.(error);
    };

    return () => {
      ws.close();
    };
  }, [token, url]);

  const sendMessage = (action: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, data }));
    }
  };

  return {
    isConnected,
    error,
    sendMessage,
    syncPreviews: () => sendMessage('SYNC_PREVIEWS'),
    createPreviews: (folderPath?: string, mimeTypes?: string[]) =>
      sendMessage('CREATE_PREVIEWS', { folderPath, mimeTypes }),
    stopCreatePreviews: () => sendMessage('CREATE_PREVIEWS_STOP'),
    updateExif: (folderPath?: string, mimeTypes?: string[]) =>
      sendMessage('UPDATE_EXIF', { folderPath, mimeTypes }),
    stopUpdateExif: () => sendMessage('UPDATE_EXIF_STOP'),
  };
};
```

## Authentication Flow

1. **Connection Attempt** - Client connects to WebSocket server with JWT token
2. **Token Extraction** - Server extracts token from query parameter or Authorization header
3. **Token Validation** - Server validates JWT token and checks blacklist
4. **User Lookup** - Server fetches user information from database
5. **Connection Acceptance** - If valid, connection is accepted and user context is attached
6. **Welcome Message** - Server sends welcome message with user information
7. **Message Processing** - All subsequent messages are processed with user context

## Error Handling

### Authentication Errors

- **No Token**: Connection closed with code 1008 and message "Authentication failed"
- **Invalid Token**: Connection closed with code 1008 and message "Authentication failed"
- **Blacklisted Token**: Connection closed with code 1008 and message "Authentication failed"
- **User Not Found**: Connection closed with code 1008 and message "Authentication failed"

### Connection Errors

- **Connection Lost**: Client should implement reconnection logic
- **Server Shutdown**: Connections closed with code 1001 and appropriate message

## Security Considerations

1. **Token Expiration** - JWT tokens will expire, clients should handle renewal
2. **Token Blacklisting** - Logged out tokens are immediately invalidated
3. **Connection Limits** - Consider implementing rate limiting for connections
4. **CORS** - Configure WebSocket CORS policies appropriately
5. **SSL/TLS** - Use WSS in production for encrypted connections

## Testing

### Unit Tests

The implementation includes comprehensive unit tests covering:
- Valid token authentication
- Invalid token rejection
- Blacklisted token handling
- User not found scenarios
- Different token passing methods

### Integration Testing

```typescript
describe('WebSocket Authentication Integration', () => {
  it('should authenticate and process messages', async () => {
    const token = await getValidJwtToken();
    const ws = new WebSocket(`ws://localhost:3001/?token=${token}`);
    
    await new Promise((resolve) => {
      ws.onopen = resolve;
    });
    
    ws.send(JSON.stringify({ action: 'SYNC_PREVIEWS' }));
    
    const response = await new Promise((resolve) => {
      ws.onmessage = (event) => resolve(JSON.parse(event.data));
    });
    
    expect(response.data.status).toBe('init');
  });
});
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check token validity and expiration
   - Verify token is not blacklisted
   - Ensure user exists in database

2. **Connection Refused**
   - Verify WebSocket server is running
   - Check port configuration
   - Confirm network connectivity

3. **Token Not Found**
   - Ensure token is passed in query parameter or Authorization header
   - Check token format (Bearer prefix for headers)

### Debug Logging

Enable debug logging to see authentication flow:

```typescript
// In your NestJS application
const logger = new Logger('WebSocket');
logger.debug('WebSocket authentication debug enabled');
```

## Migration from Unauthenticated WebSockets

If you have existing WebSocket clients, you'll need to:

1. Update connection code to include JWT token
2. Handle authentication errors appropriately
3. Implement token renewal logic
4. Update message handling for new response format

## Future Enhancements

- **Role-based access control** for different WebSocket actions
- **Session management** for long-lived connections
- **Reconnection strategies** with exponential backoff
- **Connection pooling** for multiple simultaneous connections
- **Metrics and monitoring** for WebSocket connections 