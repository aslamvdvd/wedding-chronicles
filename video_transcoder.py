import os
import ffmpeg
from tqdm import tqdm
import tkinter as tk
from tkinter import filedialog
from PIL import Image
import cv2
from google.cloud import storage
from google.oauth2 import service_account

# Google Cloud Storage configuration
CREDENTIALS = service_account.Credentials.from_service_account_file(
    'key.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform']
)
STORAGE_CLIENT = storage.Client(
    project='tarannumandarif786',
    credentials=CREDENTIALS
)
BUCKET_NAME = 'photo-directory-ta786'
BUCKET = STORAGE_CLIENT.bucket(BUCKET_NAME)

# Video quality presets
QUALITY_PRESETS = {
    '360p': {'width': 640, 'height': 360, 'bitrate': '800k'},
    '480p': {'width': 854, 'height': 480, 'bitrate': '1500k'},
    '720p': {'width': 1280, 'height': 720, 'bitrate': '2500k'},
    '1080p': {'width': 1920, 'height': 1080, 'bitrate': '5000k'}
}

def create_folder(folder_name):
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
        print(f"Created folder: {folder_name}")
    else:
        print(f"Folder already exists: {folder_name}")

def convert_video(input_path, output_path, resolution):
    try:
        (
            ffmpeg
            .input(input_path)
            .output(output_path, vf=f'scale={resolution}')
            .run(overwrite_output=True)
        )
        print(f"Converted video to {resolution}: {output_path}")
    except Exception as e:
        print(f"Error converting video {input_path} to {resolution}: {e}")

def create_thumbnail(input_path, output_path, time='00:00:01.000'):
    try:
        (
            ffmpeg
            .input(input_path, ss=time)
            .output(output_path, vframes=1)
            .run(overwrite_output=True)
        )
        print(f"Created thumbnail: {output_path}")
    except Exception as e:
        print(f"Error creating thumbnail for {input_path}: {e}")

def process_videos(input_dir, output_dir):
    resolutions = {'360p': '640x360', '480p': '854x480', '720p': '1280x720', '1080p': '1920x1080'}
    
    for res in resolutions.keys():
        create_folder(os.path.join(output_dir, res))
    
    create_folder(os.path.join(output_dir, 'thumbnails'))
    for res in resolutions.keys():
        create_folder(os.path.join(output_dir, 'thumbnails', res))
    
    # Debug: Print the directory contents
    print(f"Contents of the directory ({input_dir}): {os.listdir(input_dir)}")
    
    video_files = [
        f for f in os.listdir(input_dir)
        if os.path.isfile(os.path.join(input_dir, f)) and f.lower().endswith(('.mp4', '.avi', '.mkv', '.mov'))
    ]
    print(f"Found {len(video_files)} video files: {video_files}")

    if not video_files:
        print("No video files found.")
        return
    
    for video_file in tqdm(video_files, desc="Processing videos"):
        input_path = os.path.join(input_dir, video_file)
        for res, size in resolutions.items():
            output_path = os.path.join(output_dir, res, video_file)
            convert_video(input_path, output_path, size)
            thumbnail_path = os.path.join(output_dir, 'thumbnails', res, os.path.splitext(video_file)[0] + '.png')
            create_thumbnail(input_path, thumbnail_path)

def generate_thumbnail(video_path, output_path, size=(640, 640)):
    """Generate a square thumbnail from a video."""
    try:
        # Open video file
        cap = cv2.VideoCapture(video_path)
        
        # Get total frames
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Read frame from middle of video
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
        ret, frame = cap.read()
        
        if not ret:
            raise Exception("Could not read video frame")
        
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        img = Image.fromarray(frame_rgb)
        
        # Calculate dimensions for square crop
        width, height = img.size
        crop_size = min(width, height)
        left = (width - crop_size) // 2
        top = (height - crop_size) // 2
        right = left + crop_size
        bottom = top + crop_size
        
        # Crop and resize
        img = img.crop((left, top, right, bottom))
        img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Save thumbnail
        img.save(output_path, 'JPEG', quality=90)
        
        cap.release()
        return True
    except Exception as e:
        print(f"Error generating thumbnail: {str(e)}")
        return False

def transcode_video(input_path, output_path, quality):
    """Transcode video to specified quality."""
    try:
        preset = QUALITY_PRESETS[quality]
        command = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-b:v', preset['bitrate'],
            '-vf', f'scale={preset["width"]}:{preset["height"]}',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            output_path
        ]
        
        subprocess.run(command, check=True)
        return True
    except Exception as e:
        print(f"Error transcoding video: {str(e)}")
        return False

def process_video(video_path, category):
    """Process a video file: generate thumbnail and transcode to different qualities."""
    try:
        filename = os.path.basename(video_path)
        base_name = os.path.splitext(filename)[0]
        
        # Create temporary directory for processing
        temp_dir = os.path.join(os.path.dirname(video_path), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Generate thumbnail
        thumbnail_path = os.path.join(temp_dir, f"{base_name}_thumb.jpg")
        if generate_thumbnail(video_path, thumbnail_path):
            # Upload thumbnail to GCS
            blob = BUCKET.blob(f"{category}/thumbnails/{base_name}.jpg")
            blob.upload_from_filename(thumbnail_path)
        
        # Process each quality preset
        for quality in QUALITY_PRESETS:
            output_path = os.path.join(temp_dir, f"{base_name}_{quality}.mp4")
            if transcode_video(video_path, output_path, quality):
                # Upload transcoded video to GCS
                blob = BUCKET.blob(f"{category}/{quality}/{base_name}.mp4")
                blob.upload_from_filename(output_path)
        
        # Clean up temporary files
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
        os.rmdir(temp_dir)
        
        return True
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return False

def process_directory(input_dir):
    """Process all videos in a directory."""
    try:
        # Get category name from directory name
        category = os.path.basename(input_dir).lower()
        if not category.endswith('_videos'):
            category += '_videos'
        
        # Process each video file
        for filename in os.listdir(input_dir):
            if filename.lower().endswith(('.mp4', '.mov', '.avi')):
                video_path = os.path.join(input_dir, filename)
                process_video(video_path, category)
        
        return True
    except Exception as e:
        print(f"Error processing directory: {str(e)}")
        return False

if __name__ == '__main__':
    # Process each video directory
    base_dir = r"G:\Wedding_Data\videos"
    for dir_name in ['mehdi_videos', 'haldi_videos', 'wedding_videos']:
        dir_path = os.path.join(base_dir, dir_name)
        if os.path.exists(dir_path):
            print(f"Processing {dir_name}...")
            process_directory(dir_path)
