#!/bin/bash
set -e

echo "=== PHG BUILD IA — Démarrage ==="
echo "DATABASE_URL prefix: ${DATABASE_URL:0:20}..."

# Migration Alembic — on continue même si elle échoue (tables déjà créées)
echo ">>> Alembic upgrade head..."
alembic upgrade head && echo "✓ Migrations OK" || echo "⚠️  Alembic warning — tables peut-être déjà à jour"

# Fallback : création directe des tables si Alembic n'a pas pu les créer
echo ">>> Vérification tables via SQLAlchemy..."
python3 -c "
from phg_build_ia_backend import Base, engine
Base.metadata.create_all(bind=engine)
print('✓ Tables OK')
" || echo "⚠️  create_all warning"

# Démarrage uvicorn
echo ">>> Démarrage uvicorn sur port $PORT"
exec uvicorn phg_build_ia_backend:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 1 \
  --log-level info
