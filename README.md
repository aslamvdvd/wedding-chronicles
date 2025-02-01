# Wedding Chronicles Web App

A Flask web application for managing and displaying wedding photos and videos.

## Prerequisites

- Python 3.9 or higher
- Google Cloud SDK
- A Google Cloud Project with the following APIs enabled:
  - Cloud Storage
  - App Engine
  - Cloud Build

## Local Development Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
export GOOGLE_CLOUD_PROJECT="photo-directory-ta786"
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
```

4. Run the application:
```bash
python app.py
```

## Deployment to Google Cloud

1. Install Google Cloud SDK and initialize:
```bash
gcloud init
```

2. Set the project:
```bash
gcloud config set project photo-directory-ta786
```

3. Deploy to App Engine:
```bash
gcloud app deploy
```

4. View the deployed app:
```bash
gcloud app browse
```

## Project Structure

- `app.py`: Main application file
- `static/`: Static files (CSS, JS, images)
- `templates/`: HTML templates
- `app.yaml`: App Engine configuration
- `requirements.txt`: Python dependencies

## Storage Structure

The application uses Google Cloud Storage with the following structure:

```
photo-directory-ta786/
├── wedding_photos/
│   ├── thumbnails/
│   ├── low/
│   ├── medium/
│   ├── high/
│   └── original/
├── mehdi_photos/
│   ├── thumbnails/
│   ├── low/
│   ├── medium/
│   ├── high/
│   └── original/
├── haldi_photos/
│   ├── thumbnails/
│   ├── low/
│   ├── medium/
│   ├── high/
│   └── original/
├── wedding_videos/
│   ├── thumbnails/
│   ├── 720p/
│   └── 4k/
├── mehdi_videos/
│   ├── thumbnails/
│   ├── 720p/
│   └── 4k/
└── haldi_videos/
    ├── thumbnails/
    ├── 720p/
    └── 4k/
```

## Security Notes

- Ensure your service account key is never committed to version control
- Keep your environment variables secure
- Regularly update dependencies for security patches 