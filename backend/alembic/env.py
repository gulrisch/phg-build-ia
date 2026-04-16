"""
Alembic migration environment — PHG BUILD IA
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Rendre le package backend importable ─────────────────────────────────────
# alembic/ est un sous-dossier de backend/, donc on remonte d'un niveau.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importer Base et tous les modèles pour que Alembic les détecte
from phg_build_ia_backend import Base  # noqa: F401 — importe tous les modèles via Base

# ── Config Alembic ────────────────────────────────────────────────────────────
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# La cible des métadonnées pour la génération automatique de migrations
target_metadata = Base.metadata

# ── Lecture de DATABASE_URL depuis l'environnement ───────────────────────────
def get_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./phg_build_ia.db")
    # Normaliser le préfixe Railway legacy
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


# ── Migration hors-ligne (génération SQL sans connexion DB) ───────────────────
def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Migration en ligne (connexion réelle à la DB) ─────────────────────────────
def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # pas de pool pendant les migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,          # détecte les changements de type
            compare_server_default=True, # détecte les changements de valeur par défaut
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
