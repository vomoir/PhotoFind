import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { 
  Search, 
  FolderPlus, 
  Calendar, 
  MapPin, 
  User, 
  Users, 
  Tag, 
  FileText, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  AlertTriangle, 
  X, 
  Info,
  ZoomIn
} from 'lucide-react';

export default function App() {
  const {
    photos,
    selectedPhoto,
    searchQuery,
    scanning,
    scanProgress,
    scanError,
    loadingPhotos,
    fetchPhotos,
    setSearchQuery,
    selectPhoto,
    updateMetadata,
    startScan,
    checkScanOnLoad,
    deletePhoto
  } = useStore();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');

  // Local state for metadata form inputs
  const [subject, setSubject] = useState('');
  const [people, setPeople] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);

  // Load initial photos and check scan state
  useEffect(() => {
    fetchPhotos();
    checkScanOnLoad();
  }, []);

  // Update form fields when the selected photo changes
  useEffect(() => {
    if (selectedPhoto) {
      setSubject(selectedPhoto.subject || '');
      setPeople(selectedPhoto.people || '');
      setTags(selectedPhoto.tags || '');
      setDescription(selectedPhoto.description || '');
      setLocationName(selectedPhoto.location_name || '');
      setShowSaveSuccess(false);
    }
  }, [selectedPhoto]);

  const handleStartScan = (e) => {
    e.preventDefault();
    if (folderPath.trim() !== '') {
      startScan(folderPath.trim());
    }
  };

  const handleSaveMetadata = async (e) => {
    e.preventDefault();
    if (!selectedPhoto) return;

    setIsSaving(true);
    const success = await updateMetadata(selectedPhoto.id, {
      subject: subject.trim(),
      people: people.trim(),
      tags: tags.trim(),
      description: description.trim(),
      location_name: locationName.trim(),
    });
    setIsSaving(false);

    if (success) {
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    }
  };
  const handleDeletePhoto = async (e) => {
    e.preventDefault();
    if (!selectedPhoto) return;

    if (!window.confirm(`Are you sure you want to delete "${selectedPhoto.filename}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    const success = await deletePhoto(selectedPhoto.id);
    setIsDeleting(false);

    if (!success) {
      setShowDeleteError(true);
      setTimeout(() => setShowDeleteError(false), 3000);
    }
  };

  const handleDeletePhoto = async (e) => {
    e.preventDefault();
    if (!selectedPhoto) return;

    if (!window.confirm(`Are you sure you want to delete "${selectedPhoto.filename}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    const success = await deletePhoto(selectedPhoto.id);
    setIsDeleting(false);

    if (!success) {
      setShowDeleteError(true);
      setTimeout(() => setShowDeleteError(false), 3000);
    }
  };

  const formatExifDate = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to get image source path
  const getImgSrc = (filePath) => {
    return `/api/photo/file?filePath=${encodeURIComponent(filePath)}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-icon">📷</span>
          <h1 className="logo-title">PhotoFind</h1>
        </div>

        <div className="controls-section">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by filename, location, subject, people ('Rossco'), or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => setImportModalOpen(true)}
            disabled={scanning}
          >
            <FolderPlus size={18} />
            {scanning ? 'Scanning...' : 'Import Photos'}
          </button>
        </div>
      </header>

      {/* Main Panel Layout */}
      <main className="main-workspace">

        {/* Left Panel: Photo Preview & Metadata Editor */}
        <section className="panel-left">
          <div className="viewer-section">
            {selectedPhoto ? (
              <>
                {/* File Metadata Header */}
                <div className="file-info-header">
                  <h2 className="file-info-title">{selectedPhoto.filename}</h2>
                  <p className="file-info-path" title={selectedPhoto.filepath}>
                    {selectedPhoto.filepath}
                  </p>
                </div>

                {/* Scaled Image Preview */}
                <div className="image-preview-container" onClick={() => setFullscreenModalOpen(true)}>
                  <img
                    src={getImgSrc(selectedPhoto.filepath)}
                    alt={selectedPhoto.filename}
                    className="image-preview"
                    loading="lazy"
                  />
                  <div className="image-fullscreen-overlay">
                    <ZoomIn size={24} />
                    <span>Click to view fullscreen</span>
                  </div>
                </div>

                {/* Form to Edit/Save Metadata */}
                <form className="metadata-form" onSubmit={handleSaveMetadata}>

                  {/* Subject */}
                  <div className="form-group">
                    <label className="form-label">
                      <User size={14} /> Main Subject
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Who or what is the main subject? (e.g. Rossco, Landscape)"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  {/* People In Photo */}
                  <div className="form-group">
                    <label className="form-label">
                      <Users size={14} /> Other People in Photo
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Comma-separated list (e.g. Rossco, Sarah, Dave)"
                      value={people}
                      onChange={(e) => setPeople(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={14} /> Location Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Location name (automatically reverse geocoded if GPS exists)"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                  </div>

                  {/* Tags */}
                  <div className="form-group">
                    <label className="form-label">
                      <Tag size={14} /> Tags
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Comma-separated tags (e.g. holiday, beach, night)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">
                      <FileText size={14} /> Description / Notes
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder="Add descriptions or comments..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Date and GPS Metadata Info */}
                  <div className="form-row" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} />
                      <span>{formatExifDate(selectedPhoto.date_taken)}</span>
                    </div>
                    {selectedPhoto.latitude && selectedPhoto.longitude && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} />
                        <span>GPS Coordinates ({selectedPhoto.latitude.toFixed(4)}, {selectedPhoto.longitude.toFixed(4)})</span>
                      </div>
                    )}
                  </div>

                  {/* Save/Delete actions */}
                  <div className="form-actions">
                    {showSaveSuccess && (
                      <span className="save-success-msg">
                        <Check size={16} /> Saved Successfully
                      </span>
                    )}
                    {showDeleteError && (
                      <span style={{ color: '#fca5a5', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Error deleting photo
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={handleDeletePhoto}
                        disabled={isDeleting}
                        style={{ color: '#ef4444' }}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 size={16} className="spinner" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            Delete Photo
                          </>
                        )}
                      </button>
                      <button type="submit" className="btn-primary" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 size={16} className="spinner" />
                            Saving...
                          </>
                        ) : (
                          'Save Metadata'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="no-image-selected" style={{ height: '70vh' }}>
                <ImageIcon className="no-image-icon" />
                <p>Select a photo from the gallery to edit metadata</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Gallery Search & Grid View */}
        <section className="panel-right">

          {/* Docked Scan Progress Banner */}
          {scanning && (
            <div className="scanner-progress-container" style={{ marginBottom: '1.5rem' }}>
              <div className="scanner-progress-info">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="spinner" />
                  Scanning files...
                </span>
                <span>{scanProgress.processed} / {scanProgress.total}</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${scanProgress.total > 0 ? (scanProgress.processed / scanProgress.total) * 100 : 0}%`
                  }}
                />
              </div>
              {scanProgress.currentFile && (
                <div className="scanner-current-file" title={scanProgress.currentFile}>
                  Processing: {scanProgress.currentFile}
                </div>
              )}
            </div>
          )}

          {/* Scanner Error Banner */}
          {scanError && (
            <div className="scanner-progress-container" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '1.5rem', color: '#fca5a5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <AlertTriangle size={16} />
                Scan Error
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{scanError}</div>
            </div>
          )}

          <div className="gallery-header">
            <h2 className="gallery-title">
              {searchQuery.trim() !== '' ? 'Search Results' : 'All Photos'}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '0.75rem' }}>
                ({photos.length} item{photos.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>

          {loadingPhotos ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="spinner spinner-large" />
            </div>
          ) : photos.length > 0 ? (
            <div className="photo-grid">
              {photos.map((photo) => {
                const isSelected = selectedPhoto?.id === photo.id;

                // Construct badges lists
                const peopleList = photo.people ? photo.people.split(',').map(p => p.trim()).filter(Boolean) : [];
                const tagsList = photo.tags ? photo.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

                return (
                  <div
                    key={photo.id}
                    className={`photo-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectPhoto(photo)}
                  >
                    <div className="card-thumbnail-container">
                      <img
                        src={getImgSrc(photo.filepath)}
                        alt={photo.filename}
                        className="card-thumbnail"
                        loading="lazy"
                      />
                    </div>
                    <div className="card-details">
                      <div className="card-title" title={photo.filename}>
                        {photo.filename}
                      </div>

                      {/* Display Location */}
                      {photo.location_name && (
                        <div className="card-meta-row" title={photo.location_name}>
                          <MapPin className="card-meta-icon" />
                          <span className="card-meta-text">{photo.location_name}</span>
                        </div>
                      )}

                      {/* Display Date Taken */}
                      <div className="card-meta-row">
                        <Calendar className="card-meta-icon" />
                        <span className="card-meta-text">
                          {new Date(photo.date_taken).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Subject and People Badges */}
                      <div className="card-badges">
                        {photo.subject && (
                          <span className="card-badge" title={`Subject: ${photo.subject}`}>
                            {photo.subject}
                          </span>
                        )}
                        {peopleList.slice(0, 2).map((person, idx) => (
                          <span key={idx} className="card-badge card-badge-people" title={`Person: ${person}`}>
                            {person}
                          </span>
                        ))}
                        {peopleList.length > 2 && (
                          <span className="card-badge card-badge-people" style={{ opacity: 0.8 }}>
                            +{peopleList.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-gallery">
              <ImageIcon className="empty-gallery-icon" />
              <h3 className="empty-gallery-title">No Photos Found</h3>
              <p className="empty-gallery-desc">
                {searchQuery.trim() !== ''
                  ? `No pictures match your search filter "${searchQuery}".`
                  : 'Get started by scanning a folder containing your image library.'}
              </p>
              {searchQuery.trim() === '' && (
                <button
                  className="btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => setImportModalOpen(true)}
                >
                  <FolderPlus size={18} />
                  Import Folder
                </button>
              )}
            </div>
          )}

        </section>
      </main>

      {/* Modal Dialog: Import Directory */}
      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title">Scan Directory</h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setImportModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="modal-description">
              Provide the absolute filepath of the directory containing your images.
              The scanner will recursively search for JPG, JPEG, PNG, WEBP, and HEIC files,
              parse their EXIF locations, and register them.
            </p>

            <form onSubmit={handleStartScan} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Folder Path</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. C:\Users\YourName\Pictures\Vacation2026"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {scanning && (
                <div className="scanner-progress-container">
                  <div className="scanner-progress-info">
                    <span>Scanning...</span>
                    <span>{scanProgress.processed} / {scanProgress.total}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${scanProgress.total > 0 ? (scanProgress.processed / scanProgress.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setImportModalOpen(false)}
                  disabled={scanning}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={scanning || folderPath.trim() === ''}
                >
                  {scanning ? 'Scanning In Background...' : 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Fullscreen Image Viewer */}
      {fullscreenModalOpen && selectedPhoto && (
        <div className="fullscreen-overlay" onClick={() => setFullscreenModalOpen(false)}>
          <div className="fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="fullscreen-close-btn"
              onClick={() => setFullscreenModalOpen(false)}
              title="Close (ESC)"
            >
              <X size={24} />
            </button>
            <img
              src={getImgSrc(selectedPhoto.filepath)}
              alt={selectedPhoto.filename}
              className="fullscreen-image"
            />
            <div className="fullscreen-info">
              <p className="fullscreen-filename">{selectedPhoto.filename}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
