FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

# Copy files
COPY pyproject.toml .
COPY app/ app/
COPY tests/ tests/

# Install python dependencies
RUN pip install --no-cache-dir .

# Install Playwright browser binaries (specifically chromium)
RUN playwright install chromium

# Expose port
EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
