# Alert Extra

Vibe Coding, adding alertable sensors to Uptime Kuma.

**MQTT Health**

```shell
curl 'http://127.0.0.1:3000/mqtt/status'
# {"connected":true,"latency":2,"lastConnected":"2025-07-21T03:47:12.111Z","lastDisconnected":null}
```

## Requirements

- [Deno](https://deno.com/) 1.37.0 or higher

## Build and Run

### Running the Application

1. **Development Mode (with hot reload)**

   ```bash
   deno task dev
   ```

2. **Production Mode**

   ```bash
   deno task start
   ```

### Running Tests

```bash
deno task test
```

### Environment Variables

The application can be configured using the following environment variables:

- `LOG_LEVEL`: Log level, options are `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`
  (default is `INFO`)

### Configuration File

Application configuration is located in the `config/default.json` file, which
contains server and MQTT connection settings.
