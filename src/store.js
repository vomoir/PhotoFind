import { create } from 'zustand';

export const useStore = create((set, get) => {
  let pollIntervalId = null;

  return {
    photos: [],
    selectedPhoto: null,
    searchQuery: '',
    scanning: false,
    scanProgress: { processed: 0, total: 0, currentFile: '' },
    scanError: null,
    loadingPhotos: false,
    tags: [],

    // Fetch unique tags from API
    fetchTags: async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('Failed to fetch tags');
        const data = await response.json();
        set({ tags: data });
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    },

    // Fetch photos list from API
    fetchPhotos: async () => {
      set({ loadingPhotos: true });
      try {
        const query = get().searchQuery;
        const response = await fetch(`/api/photos?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch photos');
        const data = await response.json();

        set({ photos: data, loadingPhotos: false });

        // Preserve selection or auto-select first photo if nothing selected
        const currentSelected = get().selectedPhoto;
        if (currentSelected) {
          const updatedSelected = data.find((p) => p.id === currentSelected.id);
          if (updatedSelected) {
            set({ selectedPhoto: updatedSelected });
          } else {
            set({ selectedPhoto: data[0] || null });
          }
        } else if (data.length > 0) {
          set({ selectedPhoto: data[0] });
        }
      } catch (err) {
        console.error('Error fetching photos:', err);
        set({ loadingPhotos: false });
      }
    },

    // Set search query and trigger refetch
    setSearchQuery: (query) => {
      set({ searchQuery: query });
      get().fetchPhotos();
    },

    // Select a photo
    selectPhoto: (photo) => {
      set({ selectedPhoto: photo });
    },

    // Update photo metadata in DB and store
    updateMetadata: async (id, metadata) => {
      try {
        const response = await fetch(`/api/photos/${id}/metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });

        if (!response.ok) throw new Error('Failed to update metadata');
        const updatedPhoto = await response.json();

        // Update list of photos
        const updatedPhotos = get().photos.map((p) =>
          p.id === id ? updatedPhoto : p
        );

        set({
          photos: updatedPhotos,
          selectedPhoto: get().selectedPhoto?.id === id ? updatedPhoto : get().selectedPhoto
        });

        get().fetchTags();

        return true;
      } catch (err) {
        console.error('Error updating metadata:', err);
        return false;
      }
    },
    // Delete a photo from the database
    deletePhoto: async (id) => {
      try {
        const response = await fetch(`/api/photos/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to delete photo');

        // Remove from photos list
        const updatedPhotos = get().photos.filter((p) => p.id !== id);

        // Clear selection if deleted photo was selected
        const newSelected = updatedPhotos.length > 0 ? updatedPhotos[0] : null;

        set({
          photos: updatedPhotos,
          selectedPhoto: newSelected
        });

        return true;
      } catch (err) {
        console.error('Error deleting photo:', err);
        return false;
      }
    },
    // Start background scan of local directory
    startScan: async (directoryPath) => {
      set({ scanning: true, scanError: null, scanProgress: { processed: 0, total: 0, currentFile: '' } });
      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directoryPath }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to start scanning');
        }

        // Start polling scan status
        get().pollScanStatus();
      } catch (err) {
        set({ scanning: false, scanError: err.message });
      }
    },

    // Poll scanner status
    pollScanStatus: () => {
      if (pollIntervalId) clearInterval(pollIntervalId);

      pollIntervalId = setInterval(async () => {
        try {
          const response = await fetch('/api/scan/status');
          if (!response.ok) throw new Error('Failed to get scan status');
          const status = await response.json();

          if (status.isScanning) {
            set({
              scanning: true,
              scanProgress: {
                processed: status.processedFiles,
                total: status.totalFiles,
                currentFile: status.currentFile
              },
              scanError: status.error
            });
          } else {
            // Scanning completed or errored out
            clearInterval(pollIntervalId);
            pollIntervalId = null;
            set({
              scanning: false,
              scanProgress: {
                processed: status.processedFiles,
                total: status.totalFiles,
                currentFile: status.currentFile
              },
              scanError: status.error
            });
            // Fetch updated photos list
            get().fetchPhotos();
            get().fetchTags();
          }
        } catch (err) {
          console.error('Error polling scan status:', err);
        }
      }, 500);
    },

    // Check if scan is currently running on server mount
    checkScanOnLoad: async () => {
      try {
        const response = await fetch('/api/scan/status');
        if (!response.ok) return;
        const status = await response.json();
        if (status.isScanning) {
          set({ scanning: true });
          get().pollScanStatus();
        }
      } catch (err) {
        console.error('Error checking load scan status:', err);
      }
    }
  };
});
