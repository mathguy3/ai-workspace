# Environment Setup Guide

## Overview

The AI Interface app now supports environment variables for easy configuration. This allows you to set up your API key and other settings without manually entering them in the app.

## Quick Setup

### 1. Run the Setup Script

```bash
npm run setup
```

This will automatically create a `.env` file from the template.

### 2. Edit Your .env File

```bash
# Open .env in your editor
code .env
```

Add your OpenRouter API key:

```env
VITE_OPENROUTER_API_KEY=your-actual-openrouter-api-key-here
```

### 3. Optional Settings

You can also configure these optional settings:

```env
# Default AI model
VITE_DEFAULT_MODEL=anthropic/claude-3-haiku

# Maximum tokens per response
VITE_MAX_TOKENS=4096

# Temperature (creativity level)
VITE_TEMPERATURE=0.7

# Top P (nucleus sampling)
VITE_TOP_P=1
```

## How It Works

### Auto-Initialization

When you have a `VITE_OPENROUTER_API_KEY` in your `.env` file:

1. **App starts** → Detects environment API key
2. **API client initializes** → Automatically connects to server
3. **App shows "Connected"** → Ready to use immediately

### Fallback to Manual Setup

If no environment API key is found:

1. **App starts** → Shows "Not connected"
2. **User opens settings** → Enters API key manually
3. **User saves settings** → API client initializes
4. **App shows "Connected"** → Ready to use

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_OPENROUTER_API_KEY` | ✅ Yes | - | Your OpenRouter API key |
| `VITE_DEFAULT_MODEL` | ❌ No | `anthropic/claude-3-haiku` | Default AI model |
| `VITE_MAX_TOKENS` | ❌ No | `4096` | Maximum tokens per response |
| `VITE_TEMPERATURE` | ❌ No | `0.7` | AI response temperature |
| `VITE_TOP_P` | ❌ No | `1` | Top P for nucleus sampling |

## Security Notes

- **Never commit `.env` to version control** - It's already in `.gitignore`
- **API keys are client-side** - They're visible in the browser (this is normal for Electron apps)
- **Use environment variables** - More secure than hardcoded values

## Troubleshooting

### API Key Not Working

1. **Check the key format** - Should start with `sk-or-`
2. **Verify the key is valid** - Test it on OpenRouter's website
3. **Check for typos** - No extra spaces or characters

### Environment Variables Not Loading

1. **Restart the app** - Environment variables are loaded at startup
2. **Check file location** - `.env` should be in the project root
3. **Check file format** - No spaces around `=` sign

### Still Showing "Not Connected"

1. **Check API server** - Make sure it's running on `http://localhost:3000`
2. **Check configuration** - Ensure `useAPIClient: true` in `src/shared/config.ts`
3. **Check browser console** - Look for error messages

## Example .env File

```env
# Required: Your OpenRouter API key
VITE_OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here

# Optional: AI model settings
VITE_DEFAULT_MODEL=anthropic/claude-3-haiku
VITE_MAX_TOKENS=4096
VITE_TEMPERATURE=0.7
VITE_TOP_P=1
```

## Next Steps

1. **Set up your `.env` file** with your API key
2. **Start the API server** (if using API client mode)
3. **Run the app** and enjoy! 🎉 