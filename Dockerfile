# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:20-slim AS frontend

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install --legacy-peer-deps

COPY client/ ./
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    npm run build


# ── Stage 2: Python backend ───────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY server.py .

# Copy built frontend from stage 1
COPY --from=frontend /app/client/dist ./client/dist

EXPOSE 8000

CMD gunicorn server:app \
    --workers 4 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --bind 0.0.0.0:${PORT:-8000}
