# PhotoFind

PhotoFind is a local photo cataloging app with EXIF metadata scanning, search, and photo preview.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend and frontend in development mode:
   ```bash
   npm run dev
   ```

3. Or build the frontend for production:
   ```bash
   npm run build
   ```

4. Run the backend server to serve the built app and API:
   ```bash
   node server/index.js
   ```

## Local network access

The backend is configured to bind to `0.0.0.0` by default, so it is reachable from other devices on your local network.

- Access the app through the backend host and port, for example:
  ```text
  http://<your-local-ip>:3001/
  ```

- The frontend build output is served from the `dist/` folder, but the backend API still needs to be running for full functionality.

## Notes

- Simple static servers alone (like SimpleWebserver) will serve the frontend files but will not provide the backend `/api/*` endpoints.
- Always run `node server/index.js` alongside the built frontend for production use.
