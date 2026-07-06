# Implementation Plan - PhotoFind App

We will build a React-based application named **PhotoFind** that recursively traverses a specified local folder, extracts photo GPS coordinates and metadata, reverse-geocodes locations using a free geocoding service, stores everything in an SQLite database, and provides a beautiful user interface to add custom metadata (subjects, other people, tags) and search/filter photos.

---

## Technical Stack & Architecture

### Backend (Node.js + Express + SQLite)
- **Express**: To serve API endpoints, static UI files, and raw local images.
- **SQLite (`better-sqlite3`)**: To store photo information, custom metadata, and a geocoding cache.
- **EXIF Parser (`exifr`)**: To extract latitude, longitude, and date taken from photo EXIF metadata.
- **Reverse Geocoder**: Fetch from OpenStreetMap Nominatim with an SQLite-based coordinate cache to avoid rate-limiting and redundant API requests.

### Frontend (React + Zustand + CSS)
- **Vite + React**: For a fast, responsive user interface.
- **Zustand**: For global state management (loading states, photo list, selection, filters, and scanning progress).
- **Lucide React**: For premium modern icons.
- **Vanilla CSS**: A responsive, premium dark-themed UI featuring glassmorphism, smooth animations, and visual polish.

---

## User Review Required

> [!IMPORTANT]
> Since browsers cannot directly load local filesystem paths (e.g., `C:\Users\...`) due to security restrictions, the local backend will serve images via a secure streaming route `/api/photo/file?path=<absolute_path>`.

> [!NOTE]
> To comply with OpenStreetMap Nominatim's usage policy (maximum 1 request/second), our backend will:
> 1. Round coordinates to 4 decimal places (~11 meters) to group nearby pictures.
> 2. Cache geocoding results in SQLite so we never query the API twice for the same location.
> 3. Limit geocoding requests to 1 request per second during import.

---

## Proposed Database Schema

### Table: `photos`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `filepath` (TEXT UNIQUE) - Full absolute path of the image.
- `filename` (TEXT) - Basename of the file.
- `latitude` (REAL) - Extract from EXIF.
- `longitude` (REAL) - Extract from EXIF.
- `location_name` (TEXT) - Reverse geocoded location description.
- `subject` (TEXT) - Who or what is the main subject.
- `people` (TEXT) - Comma-separated list of other people in the photo (e.g. "Rossco, Sarah").
- `tags` (TEXT) - Comma-separated descriptors.
- `description` (TEXT) - Multi-line detailed description.
- `date_taken` (TEXT) - ISO Timestamp from EXIF.
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### Table: `geocoding_cache`
- `lat_rounded` (REAL)
- `lon_rounded` (REAL)
- `location_name` (TEXT)
- PRIMARY KEY (`lat_rounded`, `lon_rounded`)

---

## Proposed Changes

### Backend Setup
#### [NEW] [db.js](file:///d:/PhotoFind/server/db.js)
Sets up the SQLite database using `better-sqlite3` and initializes tables.

#### [NEW] [geocoder.js](file:///d:/PhotoFind/server/geocoder.js)
Reverse geocodes lat/lon using OSM Nominatim and handles local SQLite caching to avoid external API calls.

#### [NEW] [scanner.js](file:///d:/PhotoFind/server/scanner.js)
Recursively scans a directory, parses EXIF metadata using `exifr`, resolves location via the geocoder, and saves records.

#### [NEW] [index.js](file:///d:/PhotoFind/server/index.js)
Express server entry point. Sets up routes:
- `POST /api/scan` - Trigger recursive folder import.
- `GET /api/scan/status` - Query current scanning progress.
- `GET /api/photos` - Retrieve photos (supports searching by keyword across filename, subject, people, tags, location).
- `PUT /api/photos/:id/metadata` - Save user-inputted metadata.
- `GET /api/photo/file` - Streams local image binary data securely to the frontend.

### Frontend Setup
#### [NEW] [index.html](file:///d:/PhotoFind/index.html)
Main HTML page template.

#### [NEW] [vite.config.js](file:///d:/PhotoFind/vite.config.js)
Configures Vite, targeting proxy `http://localhost:3001` for `/api` requests.

#### [NEW] [src/main.jsx](file:///d:/PhotoFind/src/main.jsx)
React DOM mounting point.

#### [NEW] [src/index.css](file:///d:/PhotoFind/src/index.css)
Global styling with dark theme, glassmorphism panel styles, and layout grid.

#### [NEW] [src/store.js](file:///d:/PhotoFind/src/store.js)
Zustand store containing photos array, active selection, search queries, filter state, scanner status.

#### [NEW] [src/App.jsx](file:///d:/PhotoFind/src/App.jsx)
Arranges the layout:
- **Left Panel**: Photo preview (scaled down) + form fields (Subject, People, Tags, Description, Location).
- **Right Panel**: Search header + grid list of photos.

---

## Verification Plan

### Automated Verification
1. We will verify NPM package installation (`better-sqlite3`, `exifr`, `express`, `cors`, `zustand`, `lucide-react`, `concurrently`).
2. Run standard Node test scripts if needed.

### Manual Verification
1. Start the application (Express backend and Vite dev server) using a custom `npm run dev` script.
2. In the browser, enter a local test folder path (we can create a small test folder with a few sample photos inside the workspace).
3. Import the files, verify that GPS data is processed, geocoding coordinates are fetched, and SQLite is populated.
4. Edit metadata of a photo: set main subject to "Rossco", and save.
5. In the search box, search for "Rossco" and confirm that only matching photos are displayed.
6. Verify responsive UI scaling and layout stability.
# Walkthrough - PhotoFind App

I have successfully implemented and verified the **PhotoFind** application. The app allows users to recursively scan their local folder, extract EXIF metadata, resolve locations via reverse geocoding with a local cache, save custom metadata to an SQLite database (using Zustand for global React state management), and filter/search photos (e.g., finding photos containing "Rossco").

---

## 🛠️ Changes Made

### 1. Backend Server Services
- **Database Initialization ([db.js](file:///d:/PhotoFind/server/db.js))**: Created an SQLite database (`photos.db`) using `better-sqlite3` featuring a `photos` table and a `geocoding_cache` table.
- **Reverse Geocoder ([geocoder.js](file:///d:/PhotoFind/server/geocoder.js))**: Integrated the **BigDataCloud Client API** (bypassing cloud environment blockages faced by OSM Nominatim) to convert latitude and longitude into locality descriptors, including caching coordinates (rounded to 4 decimal places, ~11m precision) in SQLite to minimize network calls and throttled calls to respect fair use.
- **Directory Scanner ([scanner.js](file:///d:/PhotoFind/server/scanner.js))**: Recursively walks any specified folder path, extracts EXIF info (`latitude`, `longitude`, `date_taken`) via `exifr`, resolves location using the geocoder, and saves records.
- **Express Server ([index.js](file:///d:/PhotoFind/server/index.js))**: Exposes REST endpoints (`POST /api/scan`, `GET /api/scan/status`, `GET /api/photos`, `PUT /api/photos/:id/metadata`, `GET /api/photo/file` to serve local images securely without breaching browser `file://` security policies).

### 2. Frontend React Web Application
- **Vite & Setup ([vite.config.js](file:///d:/PhotoFind/vite.config.js), [index.html](file:///d:/PhotoFind/index.html), [main.jsx](file:///d:/PhotoFind/src/main.jsx))**: Set up Vite with local API proxying and Outfit/Inter fonts.
- **Zustand State Store ([store.js](file:///d:/PhotoFind/src/store.js))**: Controls the list of photos, selections, searching, and polls the scanner progress from the backend.
- **Aesthetic Styling ([index.css](file:///d:/PhotoFind/src/index.css))**: Implemented a responsive dark mode theme with glassmorphism panels, interactive badges, loading indicators, custom scrollbars, and card micro-animations.
- **Main Layout Component ([App.jsx](file:///d:/PhotoFind/src/App.jsx))**: Presents:
  - **Left Panel**: Scaled image preview with a metadata editor form (Subject, People, Location, Tags, Description).
  - **Right Panel**: Search box + photo gallery card grid + docked scan progress tracker.

---

## 🧪 Verification & Results

### Automated Integration Verification
We ran an end-to-end integration test (`server/verify_backend.js`) demonstrating that:
- The backend successfully scans files.
- GPS coordinates are reverse-geocoded successfully (e.g., `-33.8688, 151.2093` resolves to `Sydney, New South Wales, Australia`).
- Photos are loaded into SQLite and accessible via API.

### Interactive User Interface Verification
The browser subagent completed the following checklist successfully:
1. Navigated to `http://localhost:3000` to view the catalog of loaded photos (`cafe.png` and `mountains.png`).
2. Selected `cafe.png` and populated its metadata fields (Main Subject: `Friend`, Other People: `Rossco`, Tags: `sydney, holiday`, Description: `Chilling at a cafe with my mate Rossco in Sydney`).
3. Clicked **Save Metadata** and verified saving was successful.
4. Searched for "**Rossco**" and verified only `cafe.png` remained visible.
5. Searched for "**Italy**" and verified only `mountains.png` remained visible.
6. Opened the **Import Photos** modal and verified directory selection input.

---

## 🎥 Media Demonstration

### App Initial State
![App Initial State](file:///C:/Users/61411/.gemini/antigravity-ide/brain/1c5d09a5-4d4e-48b7-84dd-b7efac751ff7/initial_state_1783308320804.png)

### Saving Metadata (Rossco)
![Saving Metadata](file:///C:/Users/61411/.gemini/antigravity-ide/brain/1c5d09a5-4d4e-48b7-84dd-b7efac751ff7/save_toast_check_1783308397775.png)

### Interactive UI Session
![Interactive UI Session](file:///C:/Users/61411/.gemini/antigravity-ide/brain/1c5d09a5-4d4e-48b7-84dd-b7efac751ff7/photofind_demo_1783308299898.webp)
