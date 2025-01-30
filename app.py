from flask import Flask, render_template, request, redirect, url_for, send_file, flash
import os
from PIL import Image
import io
import secrets
from google.cloud import storage
from datetime import timedelta
from google.oauth2 import service_account

app = Flask(__name__)
app.secret_key = 'a7e5b3f9c2d1e8406b9d2c5f4e3a1b8d'

# Initialize Google Cloud Storage client
try:
    # Try loading credentials from service account key file
    credentials = service_account.Credentials.from_service_account_file(
        'key.json',
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    storage_client = storage.Client(
        project='tarannumandarif786',
        credentials=credentials
    )
except Exception as e:
    # Fall back to default credentials (App Engine environment)
    storage_client = storage.Client(project='tarannumandarif786')

BUCKET_NAME = 'photo-directory-ta786'
bucket = storage_client.bucket(BUCKET_NAME)

def get_blob(path):
    """Helper function to get a blob from GCS"""
    blob = bucket.blob(path)
    if not blob.exists():
        return None
    return blob

@app.route('/favicon.ico')
def favicon():
    try:
        blob = get_blob('favicon_io/favicon.ico')
        if not blob:
            return "Favicon not found", 404
        data = blob.download_as_bytes()
        return send_file(io.BytesIO(data), mimetype='image/x-icon')
    except Exception as e:
        app.logger.error(f"Error serving favicon: {str(e)}")
        return "Error serving favicon", 500

@app.route('/apple-touch-icon.png')
def apple_touch_icon():
    try:
        blob = get_blob('favicon_io/apple-touch-icon.png')
        if not blob:
            return "Icon not found", 404
        data = blob.download_as_bytes()
        return send_file(io.BytesIO(data), mimetype='image/png')
    except Exception as e:
        app.logger.error(f"Error serving apple touch icon: {str(e)}")
        return "Error serving icon", 500

@app.route('/favicon-32x32.png')
def favicon_32():
    try:
        blob = get_blob('favicon_io/favicon-32x32.png')
        if not blob:
            return "Icon not found", 404
        data = blob.download_as_bytes()
        return send_file(io.BytesIO(data), mimetype='image/png')
    except Exception as e:
        app.logger.error(f"Error serving favicon-32: {str(e)}")
        return "Error serving icon", 500

@app.route('/favicon-16x16.png')
def favicon_16():
    try:
        blob = get_blob('favicon_io/favicon-16x16.png')
        if not blob:
            return "Icon not found", 404
        data = blob.download_as_bytes()
        return send_file(io.BytesIO(data), mimetype='image/png')
    except Exception as e:
        app.logger.error(f"Error serving favicon-16: {str(e)}")
        return "Error serving icon", 500

@app.route('/site.webmanifest')
def webmanifest():
    try:
        blob = get_blob('favicon_io/site.webmanifest')
        if not blob:
            return "Manifest not found", 404
        data = blob.download_as_bytes()
        return send_file(
            io.BytesIO(data),
            mimetype='application/manifest+json',
            download_name='site.webmanifest'
        )
    except Exception as e:
        app.logger.error(f"Error serving webmanifest: {str(e)}")
        return "Error serving manifest", 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/photos')
def photos():
    return render_template('photos_selection.html')

@app.route('/videos')
def videos():
    return render_template('videos_selection.html')

@app.route('/wedding_videos')
def wedding_videos():
    try:
        # List videos in the wedding_videos folder
        prefix = "wedding_videos/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        videos = []
        video_files = {}
        
        # First, collect all video files and their qualities
        for blob in blobs:
            if blob.name.lower().endswith('.mp4'):
                parts = blob.name.split('/')
                if len(parts) >= 2:
                    quality = parts[-2]  # Get quality from path (360p, 480p, etc.)
                    video_name = os.path.splitext(parts[-1])[0]  # Get base name without extension
                    
                    if video_name not in video_files:
                        video_files[video_name] = {'urls': {}}
                    
                    # Generate signed URL for this quality
                    url = blob.generate_signed_url(
                        version="v4",
                        expiration=timedelta(minutes=30),
                        method="GET"
                    )
                    video_files[video_name]['urls'][quality] = url
        
        # Then, get thumbnails and create video objects
        for video_name, video_data in video_files.items():
            # Get thumbnail URL
            thumbnail_blob = bucket.blob(f"{prefix}thumbnails/{video_name}.jpg")
            thumbnail_url = thumbnail_blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=30),
                method="GET"
            ) if thumbnail_blob.exists() else video_data['urls'].get('360p', '')
            
            videos.append({
                'urls': video_data['urls'],
                'thumbnail': thumbnail_url
            })
        
        return render_template('wedding_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading wedding videos: {str(e)}")
        return render_template('wedding_videos.html', videos=[], total_videos=0)

@app.route('/mehdi_videos')
def mehdi_videos():
    try:
        # List videos in the mehdi_videos folder
        prefix = "mehdi_videos/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        videos = []
        video_files = {}
        
        # First, collect all video files and their qualities
        for blob in blobs:
            if blob.name.lower().endswith('.mp4'):
                parts = blob.name.split('/')
                if len(parts) >= 2:
                    quality = parts[-2]  # Get quality from path (360p, 480p, etc.)
                    video_name = os.path.splitext(parts[-1])[0]  # Get base name without extension
                    
                    if video_name not in video_files:
                        video_files[video_name] = {'urls': {}}
                    
                    # Generate signed URL for this quality
                    url = blob.generate_signed_url(
                        version="v4",
                        expiration=timedelta(minutes=30),
                        method="GET"
                    )
                    video_files[video_name]['urls'][quality] = url
        
        # Then, get thumbnails and create video objects
        for video_name, video_data in video_files.items():
            # Get thumbnail URL
            thumbnail_blob = bucket.blob(f"{prefix}thumbnails/{video_name}.jpg")
            thumbnail_url = thumbnail_blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=30),
                method="GET"
            ) if thumbnail_blob.exists() else video_data['urls'].get('360p', '')
            
            videos.append({
                'urls': video_data['urls'],
                'thumbnail': thumbnail_url
            })
        
        return render_template('mehdi_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading mehdi videos: {str(e)}")
        return render_template('mehdi_videos.html', videos=[], total_videos=0)

@app.route('/haldi_videos')
def haldi_videos():
    try:
        # List videos in the haldi_videos folder
        prefix = "haldi_videos/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        videos = []
        video_files = {}
        
        # First, collect all video files and their qualities
        for blob in blobs:
            if blob.name.lower().endswith('.mp4'):
                parts = blob.name.split('/')
                if len(parts) >= 2:
                    quality = parts[-2]  # Get quality from path (360p, 480p, etc.)
                    video_name = os.path.splitext(parts[-1])[0]  # Get base name without extension
                    
                    if video_name not in video_files:
                        video_files[video_name] = {'urls': {}}
                    
                    # Generate signed URL for this quality
                    url = blob.generate_signed_url(
                        version="v4",
                        expiration=timedelta(minutes=30),
                        method="GET"
                    )
                    video_files[video_name]['urls'][quality] = url
        
        # Then, get thumbnails and create video objects
        for video_name, video_data in video_files.items():
            # Get thumbnail URL
            thumbnail_blob = bucket.blob(f"{prefix}thumbnails/{video_name}.jpg")
            thumbnail_url = thumbnail_blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=30),
                method="GET"
            ) if thumbnail_blob.exists() else video_data['urls'].get('360p', '')
            
            videos.append({
                'urls': video_data['urls'],
                'thumbnail': thumbnail_url
            })
        
        return render_template('haldi_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading haldi videos: {str(e)}")
        return render_template('haldi_videos.html', videos=[], total_videos=0)

@app.route('/serve_image/<path:filename>')
def serve_image(filename):
    try:
        # Get image from GCS
        blob = get_blob(filename)
        if not blob:
            app.logger.error(f"Image not found: {filename}")
            return "Image not found", 404

        # Download to memory
        img_data = blob.download_as_bytes()
        img = Image.open(io.BytesIO(img_data))

        # Process image
        img_io = io.BytesIO()
        
        # Handle orientation
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif is not None:
                orientation = exif.get(274)  # 274 is the orientation tag
                if orientation is not None:
                    if orientation == 3:
                        img = img.rotate(180, expand=True)
                    elif orientation == 6:
                        img = img.rotate(270, expand=True)
                    elif orientation == 8:
                        img = img.rotate(90, expand=True)

        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to BytesIO
        img.save(img_io, format='JPEG', quality=95, optimize=True, exif=b'')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/jpeg')
    except Exception as e:
        app.logger.error(f"Error serving image {filename}: {str(e)}")
        return "Error serving image", 500

@app.route('/serve_thumbnail/<path:filename>')
def serve_thumbnail(filename):
    try:
        # Construct the thumbnail path
        parts = filename.split('/')
        album_name = parts[0]  # e.g., 'mehdi_photos'
        thumbnail_path = f"{album_name}/thumbnails/{os.path.basename(filename)}"
        
        # Get thumbnail from GCS
        blob = get_blob(thumbnail_path)
        if not blob:
            app.logger.error(f"Thumbnail not found: {thumbnail_path}")
            return "Thumbnail not found", 404

        # Download and process
        img_data = blob.download_as_bytes()
        img = Image.open(io.BytesIO(img_data))

        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to BytesIO
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG', quality=85, optimize=True, exif=b'')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/jpeg')
    except Exception as e:
        app.logger.error(f"Error serving thumbnail {filename}: {str(e)}")
        return "Error serving thumbnail", 500

@app.route('/photos/<album_name>')
def album_photos(album_name):
    try:
        # List objects in the SD folder
        prefix = f"{album_name}_photos/sd/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        # Filter and sort images
        images = sorted([
            blob.name.split('/')[-1]
            for blob in blobs
            if blob.name.lower().endswith(('jpg', 'jpeg', 'png', 'gif'))
        ])
        
        # Create image objects with proper paths
        image_objects = [{
            'filename': f'{album_name}_photos/thumbnails/{img}',
            'full': f'{album_name}_photos/sd/{img}'
        } for img in images]
        
        return render_template(f'{album_name}_photos.html', images=image_objects, total_images=len(images))
    except Exception as e:
        app.logger.error(f"Error loading {album_name} photos: {str(e)}")
        return render_template(f'{album_name}_photos.html', images=[], total_images=0)

@app.route('/download/<album_name>/<quality_folder>/<filename>/<quality>')
def download_image(album_name, quality_folder, filename, quality):
    try:
        # Remove _photos if it's already in the album_name
        album_base = album_name.replace('_photos', '')
        
        # Construct the path
        path = f"{album_base}_photos/{quality_folder}/{filename}"
        app.logger.info(f"Attempting to download: {path}")
        
        # Get the image from GCS
        blob = get_blob(path)
        if not blob:
            app.logger.error(f"Download image not found: {path}")
            return "Image not found", 404

        try:
            # Try to generate signed URL with credentials
            if isinstance(storage_client.credentials, service_account.Credentials):
                url = blob.generate_signed_url(
                    version="v4",
                    expiration=timedelta(minutes=15),
                    method="GET",
                    response_disposition=f'attachment; filename="{os.path.splitext(filename)[0]}_{quality}.jpg"'
                )
                return redirect(url)
            else:
                # Fall back to direct download
                raise Exception("No service account credentials available")
                
        except Exception as e:
            app.logger.warning(f"Falling back to direct download: {str(e)}")
            # Fall back to direct download
            data = blob.download_as_bytes()
            return send_file(
                io.BytesIO(data),
                mimetype='image/jpeg',
                as_attachment=True,
                download_name=f"{os.path.splitext(filename)[0]}_{quality}.jpg"
            )
            
    except Exception as e:
        app.logger.error(f"Error downloading image {path if 'path' in locals() else 'unknown'}: {str(e)}")
        return "Error processing image", 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
