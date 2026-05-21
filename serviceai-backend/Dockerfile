FROM python:3.10-slim

# ── 1. Base system packages + Xvfb ───────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    curl \
    xvfb \
    libxi6 \
    libnss3 \
    libxss1 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    fonts-liberation \
    libgbm1 \
    && (apt-get install -y --no-install-recommends libgconf-2-4   2>/dev/null || true) \
    && (apt-get install -y --no-install-recommends libvulkan1      2>/dev/null || true) \
    && (apt-get install -y --no-install-recommends libasound2      2>/dev/null \
        || apt-get install -y --no-install-recommends libasound2t64 2>/dev/null || true) \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Add Google Chrome repo (modern gpg — apt-key removed in Bookworm) ─────
RUN mkdir -p /usr/share/keyrings \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub \
       | gpg --dearmor > /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] \
       http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list

# ── 3. Install Chrome ─────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ── 4. Python env ─────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PORT=8001 \
    DISPLAY=:99

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure LF line endings on start.sh regardless of how git checked it out
RUN sed -i 's/\r//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 8001

# start.sh starts Xvfb then uvicorn
CMD ["/app/start.sh"]
