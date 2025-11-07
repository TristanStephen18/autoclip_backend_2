FROM node:20

# Install ffmpeg, python, and pip
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip python3-venv

# Create a dedicated virtualenv for Python tools (PEP 668 compliant)
RUN python3 -m venv /opt/yt && \
    /opt/yt/bin/pip install --no-cache-dir -U pip && \
    /opt/yt/bin/pip install --no-cache-dir yt-dlp

# Make the yt-dlp binary accessible globally
ENV PATH="/opt/yt/bin:$PATH"

WORKDIR /app

# Install Node dependencies (skip postinstall scripts as you do)
COPY package*.json ./
RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

CMD ["npm", "start"]
