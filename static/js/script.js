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

// Video handling
document.addEventListener('DOMContentLoaded', function() {
    initializeVideoGallery();
});

function initializeVideoGallery() {
    const videoContainers = document.querySelectorAll('.video-container');
    const modal = document.getElementById('video-modal');
    const modalVideo = document.getElementById('modal-video');
    const closeBtn = document.querySelector('.close-modal');
    const qualityBtns = document.querySelectorAll('.quality-btn');

    if (!videoContainers.length) return;

    videoContainers.forEach(container => {
        container.addEventListener('click', function() {
            openVideoModal(this);
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeVideoModal);
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeVideoModal();
            }
        });
    }

    if (qualityBtns) {
        qualityBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const quality = this.dataset.quality;
                changeVideoQuality(quality);
            });
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeVideoModal();
        }
    });
}

function openVideoModal(container) {
    const modal = document.getElementById('video-modal');
    const modalVideo = document.getElementById('modal-video');
    
    if (!modal || !modalVideo) return;

    // Store current video container reference
    window.appState.currentVideoContainer = container;
    
    // Get video URL for default quality (360p)
    const videoUrl = container.dataset.video360;
    
    modalVideo.querySelector('source').src = videoUrl;
    modalVideo.load(); // Reload the video with new source
    
    modal.style.display = 'block';
    modal.offsetHeight; // Force reflow
    modal.classList.add('active');
    
    // Start playing the video
    modalVideo.play().catch(function(error) {
        console.log("Video playback failed:", error);
    });

    // Update quality buttons state
    updateQualityButtonsState('360p');
}

function changeVideoQuality(quality) {
    const modalVideo = document.getElementById('modal-video');
    const container = window.appState.currentVideoContainer;
    
    if (!modalVideo || !container) return;

    // Get current playback time
    const currentTime = modalVideo.currentTime;
    
    // Get video URL for selected quality
    const videoUrl = container.dataset[`video${quality.replace('p', '')}`];
    
    // Update video source
    modalVideo.querySelector('source').src = videoUrl;
    modalVideo.load();
    
    // Restore playback position and continue playing
    modalVideo.addEventListener('loadedmetadata', function onLoaded() {
        modalVideo.currentTime = currentTime;
        modalVideo.play();
        modalVideo.removeEventListener('loadedmetadata', onLoaded);
    });

    // Update quality buttons state
    updateQualityButtonsState(quality);
}

function updateQualityButtonsState(activeQuality) {
    const qualityBtns = document.querySelectorAll('.quality-btn');
    qualityBtns.forEach(btn => {
        if (btn.dataset.quality === activeQuality) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const modalVideo = document.getElementById('modal-video');
    
    if (!modal || !modalVideo) return;

    modal.classList.remove('active');
    
    // Pause the video
    modalVideo.pause();
    
    // Wait for transition to complete before hiding
    setTimeout(() => {
        modal.style.display = 'none';
        modalVideo.querySelector('source').src = '';
        modalVideo.load(); // Clear the video
        window.appState.currentVideoContainer = null;
    }, 300);
}