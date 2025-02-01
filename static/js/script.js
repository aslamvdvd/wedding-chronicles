// Global state management
window.appState = {
    currentImageIndex: 0,
    totalImages: 0,
    currentImageUrl: '',
    loadingProgress: 0,
    loadingInterval: null,
    modalStack: [],
    currentVideoPath: null,
    currentVideoName: null,
    currentVideoIndex: 0,
    videoContainers: [],
    player: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeGallery();
    initializePopupEvents();
    initializeFlashMessages();
    initializeVideoGallery();
    initializeLazyLoading();
    
    // Initialize video-specific event listeners
    initializeVideoEventListeners();
    
    // Prevent text selection on double click
    document.addEventListener('mousedown', function(e) {
        const popup = document.getElementById('image-popup');
        const qualityModal = document.querySelector('.quality-modal');
        
        // Only prevent if clicking outside modals
        if (popup && 
            (!e.target.closest('#image-popup') || e.target === popup) &&
            !e.target.closest('.quality-modal')) {
            e.preventDefault();
        }
    });
});

function initializeFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    if (flashMessages.length > 0) {
        flashMessages.forEach(msg => {
            // Show message
            msg.style.display = 'flex';
            msg.style.opacity = '1';

            // Auto-hide after 5 seconds if not manually closed
            const autoHideTimeout = setTimeout(() => {
                if (msg.style.display !== 'none') {
                    hideFlashMessage(msg);
                }
            }, 5000);

            // Handle close button click
            const closeBtn = msg.querySelector('.close-flash');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    clearTimeout(autoHideTimeout);
                    hideFlashMessage(msg);
                });
            }
        });
    }
}

function hideFlashMessage(msg) {
    msg.style.opacity = '0';
    setTimeout(() => {
        msg.style.display = 'none';
        msg.remove(); // Remove from DOM after animation
    }, 300);
}

function initializeGallery() {
    const imageLinks = document.querySelectorAll('.image-container');
    imageLinks.forEach((link, i) => {
        link.setAttribute('data-index', i + 1);
    });
}

function initializePopupEvents() {
    // Only handle Escape key for quality modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.appState.modalStack.includes('quality')) {
            closeSpecificModal('quality');
        }
    });

    // Handle popup background clicks - only for quality modal
    const popup = document.getElementById('image-popup');
    if (popup) {
        popup.addEventListener('click', function(e) {
            if (e.target === popup && window.appState.modalStack.includes('quality')) {
                closeSpecificModal('quality');
            }
        });
    }

    // Handle close button click for popup
    const closeButton = document.querySelector('.close-popup');
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeSpecificModal('popup');
        });
    }

    // Prevent clicks inside quality modal from closing it
    const qualityModal = document.querySelector('.quality-modal');
    if (qualityModal) {
        qualityModal.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        // Allow clicking outside quality modal to close it
        document.addEventListener('click', function(e) {
            if (window.appState.modalStack.includes('quality') && 
                !qualityModal.contains(e.target) && 
                !e.target.closest('.download-btn')) {
                closeSpecificModal('quality');
            }
        });
    }
}

function openPopup(src, index, total) {
    window.appState.currentImageIndex = index;
    window.appState.totalImages = total;
    window.appState.currentImageUrl = src;
    
    const popup = document.getElementById("image-popup");
    const popupImg = document.getElementById("popup-img");
    
    if (!popup || !popupImg) {
        console.error("Popup elements not found");
        return;
    }
    
    // Show popup immediately
    popup.style.display = 'block';
    popup.offsetHeight; // Trigger reflow
    popup.classList.add('active');
    
    // Show loading indicator immediately
    showLoadingIndicator();
    startLoadingProgress();
    
    // Load the image
    const img = new Image();
    img.onload = function() {
        // Complete progress to 100%
        window.appState.loadingProgress = 100;
        const percentage = document.querySelector('.loading-percentage');
        if (percentage) {
            percentage.textContent = '100%';
        }
        
        // Brief delay to show 100%
        setTimeout(() => {
            hideLoadingIndicator();
            popupImg.src = src;
            popupImg.classList.add('active');
            if (!window.appState.modalStack.includes('popup')) {
                window.appState.modalStack.push('popup');
            }
        }, 300);
    };
    img.onerror = function() {
        hideLoadingIndicator();
        showErrorMessage();
    };
    img.src = src;
}

function startLoadingProgress() {
    window.appState.loadingProgress = 0;
    clearInterval(window.appState.loadingInterval);
    
    const updateProgress = () => {
        if (window.appState.loadingProgress < 90) {
            window.appState.loadingProgress += Math.random() * 10;
            if (window.appState.loadingProgress > 90) {
                window.appState.loadingProgress = 90;
            }
            const percentage = document.querySelector('.loading-percentage');
            if (percentage) {
                percentage.textContent = Math.round(window.appState.loadingProgress) + '%';
            }
        }
    };
    
    // Update progress more frequently for smoother animation
    window.appState.loadingInterval = setInterval(updateProgress, 100);
}

function showLoadingIndicator() {
    let loadingOverlay = document.querySelector('.loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        document.getElementById('image-popup').appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading image... <span class="loading-percentage">0%</span></div>
    `;
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.add('active');
}

function hideLoadingIndicator() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
    }
    
    // Clear the loading interval
    if (window.appState.loadingInterval) {
        clearInterval(window.appState.loadingInterval);
        window.appState.loadingInterval = null;
    }
}

function showErrorMessage() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load image</p>
                <button onclick="reloadCurrentImage()" class="btn">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function reloadCurrentImage() {
    openPopup(window.appState.currentImageUrl, window.appState.currentImageIndex, window.appState.totalImages);
}

function showQualityModal() {
    const qualityModal = document.querySelector('.quality-modal');
    if (qualityModal) {
        qualityModal.style.display = 'block';
        qualityModal.offsetHeight;
        qualityModal.classList.add('active');
        if (!window.appState.modalStack.includes('quality')) {
            window.appState.modalStack.push('quality');
        }
        // Disable popup controls
        disablePopupControls();
    }
}

function disablePopupControls() {
    const popup = document.getElementById('image-popup');
    if (popup) {
        const navButtons = popup.querySelectorAll('.nav-btn');
        const downloadBtn = popup.querySelector('.download-btn');
        const closeBtn = popup.querySelector('.close-popup');
        
        navButtons.forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
        });
        
        if (downloadBtn) {
            downloadBtn.style.pointerEvents = 'none';
            downloadBtn.style.opacity = '0.5';
        }
        
        if (closeBtn) {
            closeBtn.style.pointerEvents = 'none';
            closeBtn.style.opacity = '0.5';
        }
    }
}

function enablePopupControls() {
    const popup = document.getElementById('image-popup');
    if (popup) {
        const navButtons = popup.querySelectorAll('.nav-btn');
        const downloadBtn = popup.querySelector('.download-btn');
        const closeBtn = popup.querySelector('.close-popup');
        
        navButtons.forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });
        
        if (downloadBtn) {
            downloadBtn.style.pointerEvents = 'auto';
            downloadBtn.style.opacity = '1';
        }
        
        if (closeBtn) {
            closeBtn.style.pointerEvents = 'auto';
            closeBtn.style.opacity = '1';
        }
    }
}

function showDownloadProgress() {
    let loadingOverlay = document.querySelector('.download-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay download-overlay';
        document.querySelector('.quality-modal').appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Preparing download... <span class="loading-percentage">0%</span></div>
    `;
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.add('active');

    window.appState.loadingProgress = 0;
    window.appState.isDownloading = true;

    // Simulate progress
    window.appState.loadingInterval = setInterval(() => {
        if (window.appState.loadingProgress < 90) {
            window.appState.loadingProgress += Math.random() * 15;
            if (window.appState.loadingProgress > 90) window.appState.loadingProgress = 90;
            const percentage = document.querySelector('.download-overlay .loading-percentage');
            if (percentage) {
                percentage.textContent = Math.round(window.appState.loadingProgress) + '%';
            }
        }
    }, 200);
}

function hideDownloadProgress() {
    const loadingOverlay = document.querySelector('.download-overlay');
    if (loadingOverlay) {
        // Show 100% before hiding
        const percentage = loadingOverlay.querySelector('.loading-percentage');
        if (percentage) {
            percentage.textContent = '100%';
        }

        setTimeout(() => {
            loadingOverlay.classList.remove('active');
            setTimeout(() => {
                loadingOverlay.remove();
            }, 300);
        }, 500);
    }

    if (window.appState.loadingInterval) {
        clearInterval(window.appState.loadingInterval);
        window.appState.loadingInterval = null;
    }
    window.appState.isDownloading = false;
}

async function downloadWithQuality(quality) {
    try {
        // Extract album name and filename from currentImageUrl
        const parts = window.appState.currentImageUrl.split('/');
        const albumName = parts[parts.length - 3].split('_')[0];  // Get 'haldi' from 'haldi_photos'
        const filename = parts[parts.length - 1];   // e.g., 'DSC_3433.JPG'
        
        // Show loading indicator
        showLoadingIndicator();
        
        // Construct download URL
        const downloadUrl = `/download/${albumName}_photos/${quality}/${filename}/${quality}`;
        console.log('Attempting download from:', downloadUrl);  // Debug log
        
        // Fetch the download URL
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // Get the redirect URL from response
        const downloadLink = response.url;
        
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadLink;
        link.download = `${filename.split('.')[0]}_${quality}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Hide loading indicator and close quality modal
        hideLoadingIndicator();
        closeSpecificModal('quality');
        
    } catch (error) {
        console.error('Error downloading image:', error);
        hideLoadingIndicator();
        showErrorMessage();
    }
}

function closeTopModal() {
    if (window.appState.modalStack.length === 0) return;
    
    const lastModal = window.appState.modalStack[window.appState.modalStack.length - 1];
    let modalElement;
    
    switch (lastModal) {
        case 'quality':
            modalElement = document.querySelector('.quality-modal');
            break;
        case 'share':
            modalElement = document.querySelector('.share-modal');
            break;
        case 'popup':
            modalElement = document.getElementById('image-popup');
            break;
    }
    
    if (modalElement && modalElement.classList.contains('active')) {
        modalElement.classList.remove('active');
        setTimeout(() => {
            modalElement.style.display = 'none';
            if (lastModal === 'popup') {
                const popupImg = document.getElementById('popup-img');
                if (popupImg) popupImg.src = '';
            }
        }, 300);
        window.appState.modalStack.pop();
    }
}

function closeSpecificModal(modalType) {
    const modalIndex = window.appState.modalStack.indexOf(modalType);
    if (modalIndex === -1) return;
    
    let modalElement;
    switch (modalType) {
        case 'quality':
            modalElement = document.querySelector('.quality-modal');
            break;
        case 'share':
            modalElement = document.querySelector('.share-modal');
            break;
        case 'popup':
            modalElement = document.getElementById('image-popup');
            break;
    }
    
    if (modalElement && modalElement.classList.contains('active')) {
        modalElement.classList.remove('active');
        setTimeout(() => {
            modalElement.style.display = 'none';
            if (modalType === 'popup') {
                const popupImg = document.getElementById('popup-img');
                if (popupImg) popupImg.src = '';
            }
        }, 300);
        window.appState.modalStack.splice(modalIndex, 1);
        
        // Re-enable popup controls if quality modal is closing
        if (modalType === 'quality') {
            enablePopupControls();
        }
    }
}

function navigateImage(direction) {
    const newIndex = window.appState.currentImageIndex + direction;
    
    if (newIndex < 1) {
        window.appState.currentImageIndex = window.appState.totalImages;
    } else if (newIndex > window.appState.totalImages) {
        window.appState.currentImageIndex = 1;
    } else {
        window.appState.currentImageIndex = newIndex;
    }
    
    const nextImage = document.querySelector(`.image-container[data-index="${window.appState.currentImageIndex}"]`);
    if (nextImage) {
        const imagePath = nextImage.getAttribute('onclick').match(/'([^']+)'/)[1];
        openPopup(imagePath, window.appState.currentImageIndex, window.appState.totalImages);
    }
}

// Lazy loading for thumbnails
function initializeLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy-load');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.classList.add('loaded');
        });
    }
}

// Video-related functionality
function initializeVideoGallery() {
    // Only initialize if we're on a page with video gallery
    const videoGallery = document.querySelector('.video-gallery');
    if (!videoGallery) return;

    // Store video containers for navigation and make them interactive immediately
    const containers = document.querySelectorAll('.video-container');
    window.appState.videoContainers = Array.from(containers);
    window.appState.currentVideoIndex = 0;

    // Make containers clickable immediately
    containers.forEach((container, index) => {
        container.style.cursor = 'pointer';
        container.addEventListener('click', function(e) {
            e.preventDefault();
            const videoPath = this.getAttribute('data-video-path');
            const videoName = this.getAttribute('data-name');
            const thumbnailUrl = this.getAttribute('data-thumbnail');
            window.appState.currentVideoIndex = index;
            openVideoPopup(videoPath, videoName, thumbnailUrl);
        });
    });

    // Initialize video popup controls
    initializeVideoPopupControls();

    // Load thumbnails asynchronously without blocking
    requestAnimationFrame(() => {
        loadVideoThumbnails();
    });
}

// Separate function for popup controls initialization
function initializeVideoPopupControls() {
    const popup = document.getElementById('video-popup');
    if (!popup) return;

    const controls = {
        prev: popup.querySelector('.popup-nav-btn.prev'),
        next: popup.querySelector('.popup-nav-btn.next'),
        close: popup.querySelector('.close-popup'),
        play: popup.querySelector('.play-overlay'),
        download: popup.querySelector('.download-btn')
    };

    if (controls.prev) {
        controls.prev.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPreviousVideo();
        });
    }

    if (controls.next) {
        controls.next.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showNextVideo();
        });
    }

    if (controls.close) {
        controls.close.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
                closeVideoPopup();
        });
    }

    if (controls.play) {
        controls.play.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            playVideo();
        });
    }

    if (controls.download) {
        controls.download.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showDownloadModal();
        });
    }
}

async function loadVideoThumbnails() {
    const containers = document.querySelectorAll('.video-container');
    
    // Process thumbnails in smaller batches to prevent UI blocking
    const batchSize = 4;
    const totalBatches = Math.ceil(containers.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, containers.length);
        const batch = Array.from(containers).slice(start, end);
        
        await Promise.all(batch.map(async (container) => {
            const thumbnailImg = container.querySelector('img.video-thumbnail');
            if (!thumbnailImg || !thumbnailImg.dataset.src) return;
            
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        thumbnailImg.src = img.src;
                        thumbnailImg.classList.add('loaded');
                        resolve();
                    };
                    img.onerror = () => {
                        thumbnailImg.src = '/static/custom_graphics/default-thumbnail.jpg';
                        resolve();
                    };
                    img.src = thumbnailImg.dataset.src;
                });
            } catch (error) {
                console.error('Error loading thumbnail:', error);
                thumbnailImg.src = '/static/custom_graphics/default-thumbnail.jpg';
            }
        }));
        
        // Small delay between batches to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

function getVideoPath(originalPath, quality) {
    // Extract event type and filename from the original path
    const pathParts = originalPath.split('/');
    const eventType = pathParts[0]; // e.g., "wedding_videos", "mehdi_videos", "haldi_videos"
    const fileName = pathParts[pathParts.length - 1];
    
    // Convert video extension to jpg for thumbnails
    const thumbnailName = quality === 'thumbnail' 
        ? fileName.replace(/\.(MP4|mp4)$/, '.jpg')
        : fileName;
    
    // Handle thumbnail path
    if (quality === 'thumbnail') {
        return `/serve_thumbnail/${eventType}/thumbnails/${thumbnailName}`;
    }
    
    // For streaming and downloads, use the GCS path structure
    const gcsPath = `${eventType}/${quality}/${fileName}`;
    
    if (quality === '720p' || quality === '4k') {
        return `/stream_video/${gcsPath}`;
    }
    
    return `/download_video/${gcsPath}`;
}

async function openVideoPopup(videoPath, videoName, thumbnailUrl) {
    const popup = document.getElementById('video-popup');
    const videoNameElement = popup.querySelector('.video-name');
    const thumbnail = popup.querySelector('.video-thumbnail');
    const videoPlayer = document.getElementById('videoPlayer');
    
    // Reset video player
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    videoPlayer.style.display = 'none';
    
    // Set video name and show popup
    videoNameElement.textContent = videoName;
    popup.style.display = 'block';
    popup.offsetHeight; // Force reflow
    popup.classList.add('active');
    
    // Set thumbnail
    if (thumbnail) {
        thumbnail.onerror = () => {
            thumbnail.src = '/static/custom_graphics/default-thumbnail.jpg';
        };
        thumbnail.src = thumbnailUrl;
    }
    
    // Show thumbnail container
    const thumbnailContainer = popup.querySelector('.video-thumbnail-container');
    if (thumbnailContainer) {
        thumbnailContainer.style.display = 'flex';
    }
    
    // Store video path for later use
    window.appState.currentVideoPath = videoPath;
}

async function playVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    const thumbnailContainer = document.querySelector('.video-thumbnail-container');
    const loadingOverlay = document.querySelector('.video-loading-overlay');
    const errorOverlay = document.querySelector('.video-error-overlay');
    
    if (!videoPlayer || !window.appState.currentVideoPath) return;

    try {
        // Show loading overlay and hide thumbnail
        loadingOverlay.style.display = 'flex';
        loadingOverlay.innerHTML = `
            <div class="spinner"></div>
            <p>Buffering: <span class="loading-percentage">0%</span></p>
        `;
        thumbnailContainer.style.display = 'none';
        
        // Get event type and filename from the path
        const pathParts = window.appState.currentVideoPath.split('/');
        const eventType = pathParts[0]; // e.g., "wedding_videos"
        const fileName = pathParts[pathParts.length - 1];
        
        // Construct the correct streaming path (always 720p)
        const streamPath = `${eventType}/720p/${fileName}`;
        
        // Get streaming URL through our server endpoint
        const response = await fetch('/stream_video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                video_path: streamPath
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get video URL');
        }

        const data = await response.json();
        
        // Set up video source and load
        videoPlayer.innerHTML = `<source src="${data.url}" type="video/mp4">`;
        videoPlayer.load();

        // Track buffering progress
        let lastBuffered = 0;
        const updateBuffering = () => {
            if (videoPlayer.buffered.length > 0) {
                const buffered = (videoPlayer.buffered.end(0) / videoPlayer.duration) * 100;
                if (buffered > lastBuffered) {
                    lastBuffered = buffered;
                    const percentage = document.querySelector('.loading-percentage');
                    if (percentage) {
                        percentage.textContent = Math.round(buffered) + '%';
                    }
                }
            }
        };

        videoPlayer.addEventListener('progress', updateBuffering);
        
        // Show video player when it's ready
        videoPlayer.oncanplay = function() {
            videoPlayer.removeEventListener('progress', updateBuffering);
            loadingOverlay.style.display = 'none';
            videoPlayer.style.display = 'block';
            videoPlayer.play().catch(error => {
                console.error('Error playing video:', error);
        });
        };

        videoPlayer.onerror = function(e) {
            console.error('Video error:', e);
            videoPlayer.removeEventListener('progress', updateBuffering);
            loadingOverlay.style.display = 'none';
            errorOverlay.style.display = 'flex';
            thumbnailContainer.style.display = 'flex';
            videoPlayer.style.display = 'none';
        };

    } catch (error) {
        console.error('Error loading video:', error);
        loadingOverlay.style.display = 'none';
        errorOverlay.style.display = 'flex';
        thumbnailContainer.style.display = 'flex';
        videoPlayer.style.display = 'none';
    }
}

function resetVideoPlayer() {
    const videoPlayer = document.getElementById('videoPlayer');
    const thumbnailContainer = document.querySelector('.video-thumbnail-container');
    const loadingOverlay = document.querySelector('.video-loading-overlay');
    const errorOverlay = document.querySelector('.video-error-overlay');
    
    if (videoPlayer) {
        // Stop video playback
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        
        // Clear source and empty player
        videoPlayer.innerHTML = '<source type="video/mp4">';
        videoPlayer.load();
        videoPlayer.style.display = 'none';
    }
    
    // Reset overlays
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (errorOverlay) errorOverlay.style.display = 'none';
    if (thumbnailContainer) thumbnailContainer.style.display = 'flex';
}

function showPreviousVideo() {
    if (window.appState.currentVideoIndex > 0) {
        // Reset video player state
        resetVideoPlayer();
        
        const wrapper = document.querySelector('.video-wrapper');
        wrapper.classList.add('slide-right');
        
        setTimeout(() => {
            window.appState.currentVideoIndex--;
            const container = window.appState.videoContainers[window.appState.currentVideoIndex];
            const videoPath = container.getAttribute('data-video-path');
            const videoName = container.getAttribute('data-name');
            const thumbnailUrl = container.getAttribute('data-thumbnail');
            
            wrapper.classList.remove('slide-right');
            openVideoPopup(videoPath, videoName, thumbnailUrl);
        }, 300);
    }
}

function showNextVideo() {
    if (window.appState.currentVideoIndex < window.appState.videoContainers.length - 1) {
        // Reset video player state
        resetVideoPlayer();
        
        const wrapper = document.querySelector('.video-wrapper');
        wrapper.classList.add('slide-left');
        
        setTimeout(() => {
            window.appState.currentVideoIndex++;
            const container = window.appState.videoContainers[window.appState.currentVideoIndex];
            const videoPath = container.getAttribute('data-video-path');
            const videoName = container.getAttribute('data-name');
            const thumbnailUrl = container.getAttribute('data-thumbnail');
            
            wrapper.classList.remove('slide-left');
            openVideoPopup(videoPath, videoName, thumbnailUrl);
        }, 300);
    }
}

function closeVideoPopup() {
    const popup = document.getElementById('video-popup');
    const thumbnailContainer = document.querySelector('.video-thumbnail-container');
    
    if (!popup) return;
    
    // Reset video player state
    resetVideoPlayer();
    
    // Reset state
    window.appState.currentVideoPath = null;
    
    // Hide popup with animation
    popup.classList.remove('active');
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
}

function showDownloadModal() {
    const modal = document.getElementById('download-modal');
    const popup = document.getElementById('video-popup');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoWrapper = document.querySelector('.video-wrapper');
    
    if (modal) {
        // Show the modal
        modal.style.display = 'block';
        modal.offsetHeight; // Force reflow
        modal.classList.add('active');
        
        // Disable background interactions
        if (popup) {
            const controls = popup.querySelectorAll('.popup-nav-btn, .close-popup, .play-overlay');
            controls.forEach(control => {
                control.style.pointerEvents = 'none';
                control.style.opacity = '0.5';
            });
            
            // Pause video if playing
            if (videoPlayer) {
                videoPlayer.pause();
            }
            
            // Prevent video interaction while modal is open
            if (videoWrapper) {
                videoWrapper.style.pointerEvents = 'none';
            }
        }
    }
}

function closeDownloadModal() {
    const modal = document.getElementById('download-modal');
    const popup = document.getElementById('video-popup');
    const videoWrapper = document.querySelector('.video-wrapper');
    
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        
        // Re-enable background interactions
        if (popup) {
            const controls = popup.querySelectorAll('.popup-nav-btn, .close-popup, .play-overlay');
            controls.forEach(control => {
                control.style.pointerEvents = 'auto';
                control.style.opacity = '1';
            });
            
            // Re-enable video interaction
            if (videoWrapper) {
                videoWrapper.style.pointerEvents = 'auto';
            }
        }
    }
}

async function downloadVideo(quality) {
    try {
        showLoadingSpinner();
        
        // Get the current video path from the state
        const currentVideoPath = window.appState.currentVideoPath;
        if (!currentVideoPath) {
            showErrorMessage('Video path not found');
            hideLoadingSpinner();
            return;
        }
        
        // Extract event type and filename from the current path
        const pathParts = currentVideoPath.split('/');
        const eventType = pathParts[0];  // e.g., 'mehdi_videos'
        const filename = pathParts[pathParts.length - 1];  // e.g., 'P1988045.MP4'
        
        // Construct the full video path
        const fullPath = `${eventType}/${filename}`;
        
        // Construct the download URL with the correct path and quality
        const downloadUrl = `/direct_download_video?path=${encodeURIComponent(fullPath)}&quality=${encodeURIComponent(quality)}`;
        
        console.log('Download URL:', downloadUrl); // For debugging
        
        // Create a hidden link and trigger the download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoadingSpinner();
        
        closeDownloadModal(); // Close the modal after starting download

    } catch (error) {
        console.error('Error downloading video:', error);
        hideLoadingSpinner();
        showErrorMessage('Failed to start download. Please try again.');
    }
}

function showLoadingSpinner() {
    let loadingOverlay = document.querySelector('.video-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'video-loading-overlay';
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <p>Preparing download... <span class="loading-percentage">0%</span></p>
    `;
    loadingOverlay.style.display = 'flex';
}

function hideLoadingSpinner() {
    const loadingOverlay = document.querySelector('.video-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showSuccessMessage(message) {
    // Do nothing - success messages disabled
    return;
}

function showErrorMessage(message) {
    const errorOverlay = document.querySelector('.video-error-overlay');
    if (!errorOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'video-error-overlay';
        overlay.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.style.display='none'" class="btn">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        errorOverlay.querySelector('p').textContent = message;
        errorOverlay.style.display = 'flex';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        const overlay = document.querySelector('.video-error-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }, 5000);
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function initializeVideoEventListeners() {
    // Add ESC key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const popup = document.getElementById('video-popup');
            const downloadModal = document.getElementById('download-modal');
            
            if (downloadModal && downloadModal.classList.contains('active')) {
                closeDownloadModal();
            } else if (popup && popup.classList.contains('active')) {
                closeVideoPopup();
            }
        }
    });
}