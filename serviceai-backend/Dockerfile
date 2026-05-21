FROM python:3.10-slim

# Install system dependencies for Chrome + Xvfb virtual display
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    libxi6 \
    libnss3 \
    libxss1 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    fonts-liberation \
    libgbm1 \
    libvulkan1 \
    && (apt-get install -y libgconf-2-4 2>/dev/null || true) \
    && (apt-get install -y libasound2 2>/dev/null || apt-get install -y libasound2t64 2>/dev/null || true) \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome stable
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PORT=8001 \
    DISPLAY=:99

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/start.sh

EXPOSE 8001

# start.sh launches Xvfb (virtual display) then uvicorn
CMD ["/app/start.sh"]
