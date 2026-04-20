#!/bin/bash

# Run DB migrations before starting anything
alembic upgrade head

# Start the Celery Worker (with embedded Beat scheduler) in the background
celery -A app.workers.celery_app worker --beat --loglevel=info --concurrency=2 &

# Start the FastAPI server in the foreground
# Railway automatically injects the $PORT variable, but we default to 8000 just in case
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
