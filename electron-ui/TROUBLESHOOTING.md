# Troubleshooting Guide

## "Not connected" Issue

If you're seeing "Not connected. Please check your settings." in the app, here's how to troubleshoot:

### 1. Check Which Mode You're Using

The app can run in two modes:
- **API Client Mode**: Connects to the AI Manager API server
- **Mock Mode**: Uses a local mock for testing

**Current Configuration**: The app is set to **Mock Mode** for testing.

### 2. Switch Between Modes

Edit `src/shared/config.ts`:

```typescript
export const config = {
  useAPIClient: false, // Set to true for API client, false for mock
  // ...
};
```

### 3. Test Mock Mode (Recommended for now)

With `useAPIClient: false`, the app should:
- ✅ Show "Connected" status
- ✅ Allow you to send messages
- ✅ Show mock responses
- ✅ Work without any external server

### 4. Test API Client Mode

To use the API client:

1. **Start the API server** (as per your API documentation):
   ```bash
   bun run api:dev
   ```

2. **Set configuration**:
   ```typescript
   export const config = {
     useAPIClient: true, // Enable API client
     // ...
   };
   ```

3. **Set up environment variables** (optional):
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env and add your API key
   VITE_OPENROUTER_API_KEY=your-actual-api-key-here
   ```

4. **Restart the app**:
   ```bash
   npm run dev
   ```

5. **Configure API key** (if not using .env):
   - Open the settings modal (⚙️ button)
   - Enter your OpenRouter API key
   - Click "Save Settings"
   - The API client will initialize automatically

### 5. Debug Information

The app now includes debug logging. Check the browser console for:
- Which AI manager is being used
- Connection status changes
- Initialization messages
- Error details

### 6. Common Issues

#### Mock Mode Not Working
- Check that `useAPIClient: false` in config
- Restart the app after changing config
- Check browser console for errors

#### API Client Not Connecting
- Ensure API server is running on `http://localhost:3000`
- Check browser console for connection errors
- Verify API server endpoints are working

#### Settings Issues
- Open the settings modal (⚙️ button)
- Enter a valid API key
- Save settings

### 7. Quick Test Commands

Test API server connection:
```bash
curl http://localhost:3000/health
```

Test with the provided script:
```bash
node test-api-connection.js
```

### 8. Current Status

**Mock Mode**: ✅ Working (default)
**API Client Mode**: ⚠️ Requires API server to be running

### 9. Next Steps

1. **Test Mock Mode**: Verify the app works with mock responses
2. **Start API Server**: Get the AI Manager API server running
3. **Switch to API Client**: Change config and test real API connection
4. **Configure API Key**: Set your OpenRouter API key in settings

The app is ready to work in both modes - just choose which one you want to test first! 