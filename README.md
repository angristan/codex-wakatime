# codex-wakatime

WakaTime integration for [OpenAI Codex CLI](https://github.com/openai/codex) - Track AI coding activity and time spent.

## Features

- Automatic time tracking for Codex CLI sessions
- File-level activity detection via message parsing
- 60-second heartbeat rate limiting
- Automatic WakaTime CLI installation and updates
- Cross-platform support (macOS, Linux, Windows)

## Prerequisites

1. [WakaTime account](https://wakatime.com) and API key
2. WakaTime API key configured in `~/.wakatime.cfg`:
   ```ini
   [settings]
   api_key = your-api-key-here
   ```
3. [Codex CLI](https://github.com/openai/codex) installed

## Installation

```bash
# Install the package
npm install -g codex-wakatime

# Configure the notification hook
codex-wakatime --install
```

This adds `notify = ["codex-wakatime"]` to your `~/.codex/config.toml`.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Codex CLI Session                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              agent-turn-complete event                       │
│   Codex sends notification with:                             │
│   - thread-id, turn-id                                       │
│   - cwd (working directory)                                  │
│   - last-assistant-message                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   codex-wakatime                             │
│   1. Parse notification JSON from CLI argument               │
│   2. Extract file paths from assistant message               │
│   3. Check 60-second rate limit                              │
│   4. Send heartbeat(s) to WakaTime                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   WakaTime Dashboard                         │
│   View your AI coding metrics at wakatime.com                │
└─────────────────────────────────────────────────────────────┘
```

### Notification Hook

| Event | Purpose |
|-------|---------|
| `agent-turn-complete` | Triggered after each Codex turn completes |

### File Detection Patterns

The plugin extracts file paths from the assistant's response using these patterns:

- **Code block headers**: ` ```typescript:src/index.ts `
- **Backtick paths**: `` `src/file.ts` ``
- **Action patterns**: `Created src/file.ts`, `Modified package.json`
- **Quoted paths**: `"src/file.ts"` or `'src/file.ts'`

If no files are detected, a project-level heartbeat is sent using the working directory.

## Configuration

The plugin auto-configures `~/.codex/config.toml` on installation:

```toml
notify = ["codex-wakatime"]
```

### Debug Mode

Enable debug logging by adding to `~/.wakatime.cfg`:

```ini
[settings]
debug = true
```

Logs are written to `~/.wakatime/codex.log`.

## Files & Locations

| File | Purpose |
|------|---------|
| `~/.wakatime/codex.json` | Rate limiting state |
| `~/.wakatime/codex.log` | Debug logs |
| `~/.wakatime/codex-cli-state.json` | CLI version tracking |
| `~/.codex/config.toml` | Codex configuration |
| `~/.wakatime.cfg` | WakaTime API key and settings |

## Development

```bash
# Clone the repository
git clone https://github.com/angristan/codex-wakatime
cd codex-wakatime

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run check
```

### Project Structure

```
codex-wakatime/
├── src/
│   ├── index.ts          # Main entry point
│   ├── install.ts        # Hook installation
│   ├── extractor.ts      # File path extraction
│   ├── wakatime.ts       # CLI invocation
│   ├── dependencies.ts   # CLI management
│   ├── state.ts          # Rate limiting
│   ├── logger.ts         # Logging
│   ├── options.ts        # Config parsing
│   ├── types.ts          # TypeScript interfaces
│   └── __tests__/        # Test files
├── package.json
├── tsconfig.json
└── biome.json
```

## Uninstall

```bash
# Remove the notification hook
codex-wakatime --uninstall

# Uninstall the package
npm uninstall -g codex-wakatime
```

## Commands

| Command | Description |
|---------|-------------|
| `codex-wakatime --install` | Add notification hook to Codex config |
| `codex-wakatime --uninstall` | Remove notification hook from Codex config |
| `codex-wakatime '{"type":"agent-turn-complete",...}'` | Process a notification (called by Codex) |

## Troubleshooting

### No heartbeats being sent

1. Check that your API key is configured in `~/.wakatime.cfg`
2. Verify the notify hook is set in `~/.codex/config.toml`
3. Enable debug mode and check `~/.wakatime/codex.log`

### Rate limiting

Heartbeats are rate-limited to once per 60 seconds. If you're testing, wait at least 60 seconds between Codex turns.

### CLI not found

The plugin automatically downloads `wakatime-cli` if not found. If this fails:

1. Check your internet connection
2. Manually install: https://github.com/wakatime/wakatime-cli/releases
3. Ensure `wakatime-cli` is in your PATH

## License

MIT
