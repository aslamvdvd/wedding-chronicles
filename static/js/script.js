// Global state management
window.appState = {
    currentImageIndex: 0,
    totalImages: 0,
    currentImageUrl: '',
    loadingProgress: 0,
    loadingInterval: null,
    modalStack: [],
    currentVideoContainer: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeGallery();
    initializePopupEvents();
    initializeFlashMessages();
    initializeVideoGallery();
    initializeLazyLoading();
    
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
let currentVideoPath = null;
let currentVideoName = null;
let currentVideoIndex = 0;
let videoContainers = [];
let player = null;

function initializeVideoGallery() {
    // Only initialize if we're on a page with video gallery
    const videoGallery = document.querySelector('.video-gallery');
    if (!videoGallery) return;

    videoContainers = Array.from(document.querySelectorAll('.video-container'));
    videoContainers.forEach((container, index) => {
        container.addEventListener('click', function() {
            currentVideoIndex = index;
            const videoPath = this.getAttribute('data-video-path');
            const videoName = this.getAttribute('data-name');
            const thumbnailUrl = this.getAttribute('data-thumbnail');
            openVideoPopup(videoPath, videoName, thumbnailUrl);
        });
    });

    // Initialize Video.js player only if it exists and hasn't been initialized
    const videoElement = document.getElementById('videoPlayer');
    if (videoElement && !player) {
        player = videojs('videoPlayer', {
            controls: true,
            preload: 'auto',
            fluid: true,
            responsive: true,
            playsinline: true
        });
    }

    // Initialize popup close events
    const popup = document.getElementById('video-popup');
    const closeBtn = document.querySelector('.close-popup');
    const downloadModal = document.getElementById('download-modal');
    
    if (popup) {
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                if (downloadModal && downloadModal.classList.contains('active')) {
                    closeDownloadModal();
                } else {
                    closeVideoPopup();
                }
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVideoPopup);
    }

    // Handle Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (downloadModal && downloadModal.classList.contains('active')) {
                closeDownloadModal();
            } else if (popup && popup.classList.contains('active')) {
                closeVideoPopup();
            }
        }
    });

    // Add click outside listener for download modal
    document.addEventListener('click', function(e) {
        const downloadModal = document.getElementById('download-modal');
        if (downloadModal && downloadModal.classList.contains('active')) {
            const isClickInside = downloadModal.contains(e.target);
            const isDownloadButton = e.target.closest('.download-btn');
            if (!isClickInside && !isDownloadButton) {
                closeDownloadModal();
            }
        }
    });
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
        return `${eventType}/thumbnails/${thumbnailName}`;
    }
    
    // Handle video path
    return `${eventType}/${quality}/${fileName}`;
}

async function openVideoPopup(videoPath, videoName, thumbnailUrl) {
    const popup = document.getElementById('video-popup');
    const thumbnail = document.querySelector('.video-thumbnail');
    const thumbnailContainer = document.querySelector('.video-thumbnail-container');
    const loadingOverlay = document.querySelector('.video-loading-overlay');
    const errorOverlay = document.querySelector('.video-error-overlay');
    const videoNameElement = document.querySelector('.video-name');
    
    if (!popup || !player) return;

    currentVideoPath = videoPath;
    currentVideoName = videoName;

    // Reset state
    videoNameElement.textContent = videoName;
    loadingOverlay.style.display = 'none';
    errorOverlay.style.display = 'none';
    
    // Reset video player
    player.reset();
    player.hide();
    
    // Show thumbnail
    if (thumbnail && thumbnailUrl) {
        thumbnailContainer.style.display = 'flex';
        thumbnail.src = thumbnailUrl;
    }

    // Show popup
    popup.style.display = 'flex';
    popup.offsetHeight; // Force reflow
    popup.classList.add('active');
}

async function playVideo() {
    const thumbnailContainer = document.querySelector('.video-thumbnail-container');
    const loadingOverlay = document.querySelector('.video-loading-overlay');
    const errorOverlay = document.querySelector('.video-error-overlay');
    
    if (!player || !currentVideoPath) return;

    try {
        loadingOverlay.style.display = 'flex';
        thumbnailContainer.style.display = 'none';
        
        // Get video URL for 720p streaming
        const response = await fetch('/get_video_url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                video_path: getVideoPath(currentVideoPath, '720p'),
                quality: '720p',
                purpose: 'stream'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get video URL');
        }

        const data = await response.json();
        
        // Set up video player
        player.src({ src: data.url, type: 'video/mp4' });
        player.show();
        
        player.on('loadeddata', function() {
            loadingOverlay.style.display = 'none';
            player.play();
        });

        player.on('error', function(e) {
            console.error('Video error:', e);
            loadingOverlay.style.display = 'none';
            errorOverlay.style.display = 'flex';
            thumbnailContainer.style.display = 'flex'; // Show thumbnail again on error
        });

    } catch (error) {
        console.error('Error loading video:', error);
        loadingOverlay.style.display = 'none';
        errorOverlay.style.display = 'flex';
        thumbnailContainer.style.display = 'flex'; // Show thumbnail again on error
    }
}

function showPreviousVideo() {
    if (currentVideoIndex > 0) {
        if (player) {
            player.pause();
            player.reset();
            player.hide();
        }
        
        const wrapper = document.querySelector('.video-wrapper');
        wrapper.classList.add('slide-right');
        
        setTimeout(() => {
            currentVideoIndex--;
            const container = videoContainers[currentVideoIndex];
            const videoPath = container.getAttribute('data-video-path');
            const videoName = container.getAttribute('data-name');
            const thumbnailUrl = container.getAttribute('data-thumbnail');
            
            wrapper.classList.remove('slide-right');
            openVideoPopup(videoPath, videoName, thumbnailUrl);
        }, 300);
    }
}

function showNextVideo() {
    if (currentVideoIndex < videoContainers.length - 1) {
        if (player) {
            player.pause();
            player.reset();
            player.hide();
        }
        
        const wrapper = document.querySelector('.video-wrapper');
        wrapper.classList.add('slide-left');
        
        setTimeout(() => {
            currentVideoIndex++;
            const container = videoContainers[currentVideoIndex];
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
    
    if (!popup || !player) return;
    
    // Stop video and reset player
    player.pause();
    player.reset();
    player.hide();
    
    // Reset state
    currentVideoPath = null;
    currentVideoName = null;
    
    // Reset display
    if (thumbnailContainer) {
        thumbnailContainer.style.display = 'flex';
    }
    
    // Hide popup
    popup.classList.remove('active');
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
}

function showDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (modal) {
        modal.style.display = 'block';
        modal.offsetHeight; // Force reflow
        modal.classList.add('active');
    }
}

function closeDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

async function downloadVideo(quality) {
    if (!currentVideoPath) return;

    try {
        const response = await fetch('/get_video_url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                video_path: getVideoPath(currentVideoPath, quality),
                quality: quality,
                purpose: 'download'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get video URL');
        }

        const data = await response.json();
        
        // Create a form to handle the download
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = '/download_video';
        
        // Add the video URL as a hidden input
        const urlInput = document.createElement('input');
        urlInput.type = 'hidden';
        urlInput.name = 'url';
        urlInput.value = data.url;
        
        // Add the filename as a hidden input
        const filenameInput = document.createElement('input');
        filenameInput.type = 'hidden';
        filenameInput.name = 'filename';
        filenameInput.value = `${currentVideoName}_${quality}.mp4`;
        
        form.appendChild(urlInput);
        form.appendChild(filenameInput);
        document.body.appendChild(form);
        
        form.submit();
        
        // Remove the form after submission
        setTimeout(() => {
            document.body.removeChild(form);
        }, 100);

        // Close the download modal
        closeDownloadModal();

    } catch (error) {
        console.error('Error downloading video:', error);
        alert('Failed to download video. Please try again.');
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoGallery);
} else {
    initializeVideoGallery();
}