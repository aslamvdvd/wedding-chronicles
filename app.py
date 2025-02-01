from flask import Flask, render_template, request, redirect, url_for, send_file, flash, jsonify, Response, make_response
import os
from PIL import Image
import io
import secrets
from google.cloud import storage
from datetime import timedelta
from google.oauth2 import service_account
import requests
import json
from urllib.parse import quote

app = Flask(__name__)
app.secret_key = 'a7e5b3f9c2d1e8406b9d2c5f4e3a1b8d'

# Initialize Google Cloud Storage client
try:
    app.logger.info("Initializing Google Cloud Storage client...")
    
    # Check if running on App Engine
    if os.getenv('GAE_ENV', '').startswith('standard'):
        app.logger.info("Running on App Engine, using default credentials")
        credentials = None
        storage_client = storage.Client(project='tarannumandarif786')
    else:
        # Try loading credentials from service account key file
        credentials = service_account.Credentials.from_service_account_file(
            'key.json',
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        app.logger.info(f"Loaded credentials for service account: {credentials.service_account_email}")
        
        storage_client = storage.Client(
            project='tarannumandarif786',
            credentials=credentials
        )
    
    app.logger.info("Successfully created storage client")
    
    # Test bucket access
    BUCKET_NAME = 'photo-directory-ta786'
    bucket = storage_client.bucket(BUCKET_NAME)
    app.logger.info(f"Testing access to bucket: {BUCKET_NAME}")
    
    # Try to list a few blobs to test access
    try:
        test_blobs = list(bucket.list_blobs(max_results=1))
        app.logger.info(f"Successfully listed blobs in bucket {BUCKET_NAME}")
    except Exception as e:
        app.logger.error(f"Failed to list blobs in bucket: {str(e)}")
        raise
        
except Exception as e:
    app.logger.error(f"Error initializing GCS client: {str(e)}")
    # Fall back to default credentials
    storage_client = storage.Client(project='tarannumandarif786')
    app.logger.info("Falling back to default credentials")

BUCKET_NAME = 'photo-directory-ta786'
bucket = storage_client.bucket(BUCKET_NAME)

def get_blob(path):
    """Helper function to get a blob from GCS"""
    try:
        blob = bucket.blob(path)
        if not blob.exists():
            app.logger.warning(f"Blob does not exist: {path}")
            return None
        return blob
    except Exception as e:
        app.logger.error(f"Error getting blob {path}: {str(e)}")
        return None

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
        app.logger.info("Starting to fetch wedding video thumbnails...")
        prefix = "wedding_videos/thumbnails/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        videos = []
        for blob in blobs:
            if blob.name.lower().endswith('.jpg'):
                video_name = os.path.splitext(os.path.basename(blob.name))[0]
                app.logger.info(f"Found thumbnail for video: {video_name}")
                
                try:
                    # Get the thumbnail blob
                    thumbnail_blob = bucket.blob(blob.name)
                    
                    # Generate a public URL instead of signed URL when on App Engine
                    if os.getenv('GAE_ENV', '').startswith('standard'):
                        thumbnail_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{blob.name}"
                    else:
                        thumbnail_url = blob.generate_signed_url(
                            version="v4",
                            expiration=timedelta(minutes=30),
                            method="GET"
                        )
                    
                    videos.append({
                        'name': video_name,
                        'thumbnail': thumbnail_url,
                        'video_path': f"wedding_videos/720p/{video_name}.MP4"
                    })
                except Exception as e:
                    app.logger.error(f"Error generating thumbnail URL for {video_name}: {str(e)}")
                    continue
        
        videos.sort(key=lambda x: x['name'])
        app.logger.info(f"Total videos found: {len(videos)}")
        
        return render_template('wedding_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading wedding videos: {str(e)}")
        return render_template('wedding_videos.html', videos=[], total_videos=0)

@app.route('/mehdi_videos')
def mehdi_videos():
    try:
        app.logger.info("Starting to fetch mehdi video thumbnails...")
        prefix = "mehdi_videos/thumbnails/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        videos = []
        for blob in blobs:
            if blob.name.lower().endswith('.jpg'):
                video_name = os.path.splitext(os.path.basename(blob.name))[0]
                app.logger.info(f"Found thumbnail for video: {video_name}")
                
                try:
                    # Get the thumbnail blob
                    thumbnail_blob = bucket.blob(blob.name)
                    
                    # Generate a public URL instead of signed URL when on App Engine
                    if os.getenv('GAE_ENV', '').startswith('standard'):
                        thumbnail_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{blob.name}"
                    else:
                        thumbnail_url = blob.generate_signed_url(
                            version="v4",
                            expiration=timedelta(minutes=30),
                            method="GET"
                        )
                    
                    videos.append({
                        'name': video_name,
                        'thumbnail': thumbnail_url,
                        'video_path': f"mehdi_videos/720p/{video_name}.MP4"
                    })
                except Exception as e:
                    app.logger.error(f"Error generating thumbnail URL for {video_name}: {str(e)}")
                    continue
        
        videos.sort(key=lambda x: x['name'])
        app.logger.info(f"Total videos found: {len(videos)}")
        
        return render_template('mehdi_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading mehdi videos: {str(e)}")
        return render_template('mehdi_videos.html', videos=[], total_videos=0)

@app.route('/haldi_videos')
def haldi_videos():
    try:
        app.logger.info("Starting to fetch haldi video thumbnails...")
        prefix = "haldi_videos/thumbnails/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        videos = []
        for blob in blobs:
            if blob.name.lower().endswith('.jpg'):
                video_name = os.path.splitext(os.path.basename(blob.name))[0]
                app.logger.info(f"Found thumbnail for video: {video_name}")
                
                try:
                    # Get the thumbnail blob
                    thumbnail_blob = bucket.blob(blob.name)
                    
                    # Generate a public URL instead of signed URL when on App Engine
                    if os.getenv('GAE_ENV', '').startswith('standard'):
                        thumbnail_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{blob.name}"
                    else:
                        thumbnail_url = blob.generate_signed_url(
                            version="v4",
                            expiration=timedelta(minutes=30),
                            method="GET"
                        )
                    
                    videos.append({
                        'name': video_name,
                        'thumbnail': thumbnail_url,
                        'video_path': f"haldi_videos/720p/{video_name}.MP4"
                    })
                    app.logger.info(f"Added video: {video_name} with path: haldi_videos/720p/{video_name}.MP4")
                    
                except Exception as e:
                    app.logger.error(f"Error generating thumbnail URL for {video_name}: {str(e)}")
                    continue
        
        videos.sort(key=lambda x: x['name'])
        app.logger.info(f"Total videos found: {len(videos)}")
        
        return render_template('haldi_videos.html', videos=videos, total_videos=len(videos))
    except Exception as e:
        app.logger.error(f"Error loading haldi videos: {str(e)}")
        return render_template('haldi_videos.html', videos=[], total_videos=0)

@app.route('/get_video_url', methods=['POST'])
def get_video_url():
    try:
        data = request.json
        video_path = data.get('video_path')
        quality = data.get('quality', '720p')
        purpose = data.get('purpose', 'stream')
        
        if not video_path:
            app.logger.error("No video path provided")
            return jsonify({'error': 'No video path provided'}), 400
            
        app.logger.info(f"Generating URL for video: {video_path}, quality: {quality}, purpose: {purpose}")
            
        # Get the blob
        blob = bucket.blob(video_path)
        if not blob.exists():
            app.logger.error(f"Video not found: {video_path}")
            return jsonify({'error': 'Video not found'}), 404
            
        # Generate signed URL with appropriate expiration
        expiration = timedelta(minutes=30) if purpose == 'stream' else timedelta(minutes=5)
        url = blob.generate_signed_url(
            version="v4",
            expiration=expiration,
            method="GET"
        )
        
        app.logger.info(f"Successfully generated URL for {video_path}")
        return jsonify({'url': url})
    except Exception as e:
        app.logger.error(f"Error generating video URL: {str(e)}")
        return jsonify({'error': str(e)}), 500

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

@app.route('/download')
def download_file():
    try:
        url = request.args.get('url')
        filename = request.args.get('filename')
        
        if not url or not filename:
            app.logger.error("Missing URL or filename")
            return jsonify({'error': 'URL and filename are required'}), 400
            
        app.logger.info(f"Starting download for {filename}")
        
        # Extract blob path from the URL
        if 'storage.googleapis.com' in url:
            # Public URL format
            blob_path = url.split(f'storage.googleapis.com/{BUCKET_NAME}/')[1].split('?')[0]
        else:
            # Signed URL format
            blob_path = url.split(f'/{BUCKET_NAME}/')[1].split('?')[0]
        
        app.logger.info(f"Accessing blob: {blob_path}")
        blob = bucket.blob(blob_path)
        
        if not blob.exists():
            app.logger.error(f"Blob not found: {blob_path}")
            return jsonify({'error': 'File not found'}), 404

        # On App Engine, always use public URLs
        public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_path}"
        public_url += f"?response-content-disposition=attachment%3B%20filename%3D{quote(filename)}"
        public_url += "&response-content-type=video/mp4"
        
        app.logger.info(f"Redirecting to download URL: {public_url}")
        return redirect(public_url)
        
    except Exception as e:
        app.logger.error(f'Error downloading file: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/download_video', methods=['POST'])
def get_download_url():
    try:
        data = request.get_json()
        video_path = data.get('video_path')
        quality = data.get('quality')
        
        if not video_path or not quality:
            return jsonify({'error': 'Video path and quality are required'}), 400
            
        app.logger.info(f"Processing download request for video: {video_path}, quality: {quality}")
            
        # Use the existing authenticated storage client and bucket
        blob = bucket.blob(video_path)
        
        if not blob.exists():
            app.logger.error(f"Video not found: {video_path}")
            return jsonify({'error': 'Video not found'}), 404
            
        # Get file size
        size = blob.size
        app.logger.info(f"Video size: {size} bytes")
        
        # Get filename from path and ensure it's MP4
        filename = os.path.basename(video_path)
        base_name = os.path.splitext(filename)[0]
        download_filename = f"{base_name}_{quality}.mp4"
        
        # Generate URL based on environment
        if os.getenv('GAE_ENV', '').startswith('standard'):
            # Use public URL for App Engine
            url = f"https://storage.googleapis.com/{BUCKET_NAME}/{video_path}"
            # Add query parameters for forcing download
            params = {
                'response-content-disposition': f'attachment; filename="{download_filename}"',
                'response-content-type': 'video/mp4'
            }
            # Append parameters to URL
            param_string = '&'.join([f"{k}={quote(str(v))}" for k, v in params.items()])
            url = f"{url}?{param_string}"
            app.logger.info(f"Generated public download URL: {url}")
        else:
            # Generate a signed URL with download headers
            url = blob.generate_signed_url(
                version='v4',
                expiration=timedelta(minutes=15),
                method='GET',
                response_type='video/mp4',
                query_parameters={
                    'response-content-disposition': f'attachment; filename="{download_filename}"',
                    'response-content-type': 'video/mp4'
                }
            )
            app.logger.info(f"Generated signed download URL")
        
        response_data = {
            'url': url,
            'filename': download_filename,
            'size': size,
            'content_type': 'video/mp4'
        }
        app.logger.info("Sending download URL response")
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f'Error getting download URL: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/stream_video', methods=['POST'])
def stream_video():
    try:
        data = request.get_json()
        video_path = data.get('video_path')
        
        if not video_path:
            return jsonify({'error': 'Video path is required'}), 400
            
        app.logger.info(f"Attempting to stream video: {video_path}")
            
        # Use the existing authenticated storage client and bucket
        blob = bucket.blob(video_path)
        
        if not blob.exists():
            app.logger.error(f"Video not found: {video_path}")
            return jsonify({'error': 'Video not found'}), 404
            
        # Generate a public URL instead of signed URL when on App Engine
        if os.getenv('GAE_ENV', '').startswith('standard'):
            url = f"https://storage.googleapis.com/{BUCKET_NAME}/{video_path}"
            app.logger.info(f"Generated public URL for {video_path}")
        else:
            # Generate a signed URL that expires in 1 hour
            url = blob.generate_signed_url(
                version='v4',
                expiration=timedelta(hours=1),
                method='GET',
                response_type='video/mp4',
                query_parameters={
                    'response-content-type': 'video/mp4'
                }
            )
            app.logger.info(f"Generated signed URL for {video_path}")
        
        # Return the URL
        return jsonify({
            'url': url,
            'content_type': 'video/mp4'
        })
        
    except Exception as e:
        app.logger.error(f'Error streaming video: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/direct_download_video')
def direct_download_video():
    try:
        video_path = request.args.get('path')
        quality = request.args.get('quality')
        
        if not video_path or not quality:
            app.logger.error("Missing parameters for direct download")
            return "Missing parameters", 400
        
        app.logger.info(f"Starting direct download for video: {video_path}, quality: {quality}")
        
        # Extract the event type and filename from the video path
        path_parts = video_path.split('/')
        if len(path_parts) != 2:  # Should have exactly event_type and filename
            app.logger.error(f"Invalid video path format: {video_path}")
            return "Invalid video path", 400
            
        event_type = path_parts[0]  # e.g., 'wedding_videos'
        filename = path_parts[1]    # e.g., 'P1988159.MP4'
        
        # Construct the full path with quality
        full_path = f"{event_type}/{quality}/{filename}"
        app.logger.info(f"Full video path: {full_path}")
        
        # Get the blob
        blob = bucket.blob(full_path)
        if not blob.exists():
            app.logger.error(f"Video not found: {full_path}")
            return "Video not found", 404
            
        # Construct the public URL with query parameters for download
        download_filename = f"{os.path.splitext(filename)[0]}_{quality}.mp4"
        public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{full_path}"
        public_url += f"?response-content-disposition=attachment%3B%20filename%3D{quote(download_filename)}"
        public_url += "&response-content-type=video/mp4"
        
        # Redirect to the download route with the public URL
        download_url = f"/download?url={quote(public_url)}&filename={quote(download_filename)}"
        return redirect(download_url)
        
    except Exception as e:
        app.logger.error(f'Error in direct download: {str(e)}')
        return str(e), 500

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
