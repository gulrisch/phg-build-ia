FROM python:3.11-slim

# Dépendances système pour psycopg2-binary et compilation C
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code
COPY . .

# Rendre startup.sh exécutable
RUN chmod +x startup.sh

EXPOSE 8000

CMD ["bash", "startup.sh"]
