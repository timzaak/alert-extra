FROM denoland/deno:2.4.2

WORKDIR /app

# Cache the dependencies as a layer
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock main.ts

# Copy the source code
COPY . .

# Compile the project
RUN deno cache main.ts

# Run with appropriate permissions
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]