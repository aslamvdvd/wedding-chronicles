#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run gunicorn
gunicorn --bind 0.0.0.0:8080 --workers 4 --threads 2 app:app 