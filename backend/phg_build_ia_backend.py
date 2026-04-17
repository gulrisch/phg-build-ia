"""
PHG BUILD IA — Backend FastAPI
Plateforme de construction intelligente pour la diaspora africaine francophone
"""

import os
import json
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List

try:
    import anthropic as anthropic_sdk
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

import stripe
from fastapi import FastAPI, Depends, HTTPException, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, create_engine, JSON
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "phg-build-ia-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_REPLACE_ME")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_REPLACE_ME")

stripe.api_key = STRIPE_SECRET_KEY

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./phg_build_ia.db")

# Railway injecte parfois "postgres://" (préfixe déprecié dans SQLAlchemy 2.x).
# On normalise vers "postgresql+psycopg2://" dans tous les cas.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Plans Stripe
STRIPE_PLANS = {
    "PRO": {
        "name": "PHG BUILD IA PRO",
        "price_euros": 12.90,
        "price_annual_euros": 77,
        "description": "Accès Pro — estimations illimitées",
        "price_id": os.getenv("STRIPE_PRICE_PRO", "price_PRO_REPLACE"),
    },
    "ELITE": {
        "name": "PHG BUILD IA ELITE",
        "price_euros": 25,
        "price_annual_euros": 210,
        "description": "Accès Elite — tout inclus + support prioritaire",
        "price_id": os.getenv("STRIPE_PRICE_ELITE", "price_ELITE_REPLACE"),
    },
    "ELITE_AFRIQUE": {
        "name": "PHG BUILD IA ELITE Afrique",
        "price_euros": 17,
        "price_annual_euros": 135,
        "description": "Accès Elite Afrique — mêmes fonctionnalités qu'Elite, tarif réduit pour l'Afrique",
        "price_id": os.getenv("STRIPE_PRICE_ELITE_AFRIQUE", "price_ELITE_AF_REPLACE"),
    },
}

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
_is_sqlite = DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {}
if _is_sqlite:
    # SQLite : pas de pool, thread check désactivé pour FastAPI
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL : pool robuste pour Railway
    _engine_kwargs["pool_pre_ping"] = True      # détecte les connexions mortes
    _engine_kwargs["pool_size"] = 5             # connexions permanentes
    _engine_kwargs["max_overflow"] = 10         # connexions supplémentaires si besoin
    _engine_kwargs["pool_timeout"] = 30         # secondes avant TimeoutError
    _engine_kwargs["pool_recycle"] = 1800       # recycle les connexions toutes les 30 min

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─────────────────────────────────────────────
# MODÈLES SQLAlchemy
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    country = Column(String, nullable=True)          # pays d'origine / résidence
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    country = Column(String, nullable=False)          # pays de construction
    city = Column(String, nullable=True)
    project_type = Column(String, nullable=False)     # villa, appartement, commerce, etc.
    surface_m2 = Column(Float, nullable=False)
    floors = Column(Integer, default=1)
    quality_level = Column(String, default="standard")  # economique / standard / premium
    estimated_cost_local = Column(Float, nullable=True)  # en devise locale
    estimated_cost_eur = Column(Float, nullable=True)    # en euros
    currency = Column(String, nullable=True)
    materials_detail = Column(JSON, nullable=True)    # détail des coûts matériaux
    status = Column(String, default="draft")          # draft / in_progress / completed
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    plan = Column(String, nullable=False)             # PRO / ELITE / ELITE_AFRIQUE / FREE
    stripe_subscription_id = Column(String, nullable=True)
    stripe_checkout_session_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="subscription")


class CountryData(Base):
    __tablename__ = "country_data"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String, unique=True, nullable=False)   # ISO2
    country_name = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    eur_rate = Column(Float, nullable=False)                      # 1 EUR = X devise locale
    # Coûts en devise locale / m²
    cost_economique_m2 = Column(Float, nullable=False)
    cost_standard_m2 = Column(Float, nullable=False)
    cost_premium_m2 = Column(Float, nullable=False)
    materials = Column(JSON, nullable=True)                       # prix matériaux clés
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Modules Professionnels ────────────────────────────────────────────────────

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    category = Column(String, nullable=False)       # ciment, fer, carrelage, bois, etc.
    contact = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    min_order_amount = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    rating = Column(Float, default=4.0)
    price_level = Column(String, default="standard")  # low / standard / premium
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    orders = relationship("SupplierOrder", back_populates="supplier", cascade="all, delete-orphan")


class SupplierOrder(Base):
    __tablename__ = "supplier_orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String, nullable=False)
    items = Column(JSON, nullable=False)            # [{name, qty, unit, unit_price}]
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    status = Column(String, default="pending")      # pending/confirmed/shipped/delivered/cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    supplier = relationship("Supplier", back_populates="orders")


class Chantier(Base):
    __tablename__ = "chantiers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    budget = Column(Float, nullable=True)
    spent = Column(Float, default=0)
    progress = Column(Integer, default=0)
    status = Column(String, default="planifie")     # planifie/en_cours/pause/termine
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tasks = relationship("ChantierTask", back_populates="chantier", cascade="all, delete-orphan")
    workers = relationship("ChantierWorker", back_populates="chantier", cascade="all, delete-orphan")


class ChantierTask(Base):
    __tablename__ = "chantier_tasks"
    id = Column(Integer, primary_key=True, index=True)
    chantier_id = Column(Integer, ForeignKey("chantiers.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)        # fondations/maçonnerie/toiture/finitions
    week = Column(Integer, nullable=True)
    status = Column(String, default="planifie")     # planifie/en_cours/termine/retard
    assigned_to = Column(String, nullable=True)
    budget = Column(Float, nullable=True)
    paid = Column(Float, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    chantier = relationship("Chantier", back_populates="tasks")


class ChantierWorker(Base):
    __tablename__ = "chantier_workers"
    id = Column(Integer, primary_key=True, index=True)
    chantier_id = Column(Integer, ForeignKey("chantiers.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)            # maçon/électricien/plombier/manœuvre
    daily_rate = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    present_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    total_paid = Column(Float, default=0)
    chantier = relationship("Chantier", back_populates="workers")


# ─────────────────────────────────────────────
# SEED DATA — 45 PAYS (MONDE ENTIER)
# ─────────────────────────────────────────────
AFRICAN_COUNTRIES_SEED = [
    {
        "country_code": "SN",
        "country_name": "Sénégal",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 180_000,
        "cost_standard_m2": 280_000,
        "cost_premium_m2": 500_000,
        "materials": {
            "ciment_sac_50kg": 7_500,
            "fer_beton_kg": 650,
            "sable_m3": 15_000,
            "gravier_m3": 20_000,
            "brique_unite": 350,
            "carrelage_m2": 8_000,
            "toiture_m2": 12_000,
            "peinture_litre": 4_500,
            "main_oeuvre_journalier": 5_000,
        },
    },
    {
        "country_code": "CI",
        "country_name": "Côte d'Ivoire",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 200_000,
        "cost_standard_m2": 320_000,
        "cost_premium_m2": 580_000,
        "materials": {
            "ciment_sac_50kg": 8_000,
            "fer_beton_kg": 700,
            "sable_m3": 18_000,
            "gravier_m3": 22_000,
            "brique_unite": 400,
            "carrelage_m2": 9_500,
            "toiture_m2": 14_000,
            "peinture_litre": 5_000,
            "main_oeuvre_journalier": 6_000,
        },
    },
    {
        "country_code": "CM",
        "country_name": "Cameroun",
        "currency": "XAF",
        "eur_rate": 655.957,
        "cost_economique_m2": 175_000,
        "cost_standard_m2": 270_000,
        "cost_premium_m2": 490_000,
        "materials": {
            "ciment_sac_50kg": 7_000,
            "fer_beton_kg": 620,
            "sable_m3": 14_000,
            "gravier_m3": 19_000,
            "brique_unite": 320,
            "carrelage_m2": 8_500,
            "toiture_m2": 11_000,
            "peinture_litre": 4_200,
            "main_oeuvre_journalier": 4_500,
        },
    },
    {
        "country_code": "ML",
        "country_name": "Mali",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 150_000,
        "cost_standard_m2": 230_000,
        "cost_premium_m2": 420_000,
        "materials": {
            "ciment_sac_50kg": 6_500,
            "fer_beton_kg": 580,
            "sable_m3": 12_000,
            "gravier_m3": 16_000,
            "brique_unite": 280,
            "carrelage_m2": 7_000,
            "toiture_m2": 9_500,
            "peinture_litre": 3_800,
            "main_oeuvre_journalier": 3_500,
        },
    },
    {
        "country_code": "BF",
        "country_name": "Burkina Faso",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 145_000,
        "cost_standard_m2": 220_000,
        "cost_premium_m2": 400_000,
        "materials": {
            "ciment_sac_50kg": 6_200,
            "fer_beton_kg": 560,
            "sable_m3": 11_000,
            "gravier_m3": 15_000,
            "brique_unite": 260,
            "carrelage_m2": 6_500,
            "toiture_m2": 9_000,
            "peinture_litre": 3_600,
            "main_oeuvre_journalier": 3_200,
        },
    },
    {
        "country_code": "GN",
        "country_name": "Guinée",
        "currency": "GNF",
        "eur_rate": 8_600.0,
        "cost_economique_m2": 1_500_000,
        "cost_standard_m2": 2_400_000,
        "cost_premium_m2": 4_200_000,
        "materials": {
            "ciment_sac_50kg": 55_000,
            "fer_beton_kg": 5_200,
            "sable_m3": 95_000,
            "gravier_m3": 130_000,
            "brique_unite": 2_200,
            "carrelage_m2": 65_000,
            "toiture_m2": 90_000,
            "peinture_litre": 32_000,
            "main_oeuvre_journalier": 28_000,
        },
    },
    {
        "country_code": "TG",
        "country_name": "Togo",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 155_000,
        "cost_standard_m2": 245_000,
        "cost_premium_m2": 440_000,
        "materials": {
            "ciment_sac_50kg": 6_800,
            "fer_beton_kg": 600,
            "sable_m3": 13_000,
            "gravier_m3": 17_000,
            "brique_unite": 300,
            "carrelage_m2": 7_500,
            "toiture_m2": 10_500,
            "peinture_litre": 4_000,
            "main_oeuvre_journalier": 4_000,
        },
    },
    {
        "country_code": "BJ",
        "country_name": "Bénin",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 160_000,
        "cost_standard_m2": 250_000,
        "cost_premium_m2": 450_000,
        "materials": {
            "ciment_sac_50kg": 7_000,
            "fer_beton_kg": 610,
            "sable_m3": 13_500,
            "gravier_m3": 18_000,
            "brique_unite": 310,
            "carrelage_m2": 7_800,
            "toiture_m2": 11_000,
            "peinture_litre": 4_100,
            "main_oeuvre_journalier": 4_200,
        },
    },
    {
        "country_code": "CD",
        "country_name": "RD Congo",
        "currency": "CDF",
        "eur_rate": 2_800.0,
        "cost_economique_m2": 420_000,
        "cost_standard_m2": 680_000,
        "cost_premium_m2": 1_200_000,
        "materials": {
            "ciment_sac_50kg": 18_000,
            "fer_beton_kg": 1_700,
            "sable_m3": 32_000,
            "gravier_m3": 45_000,
            "brique_unite": 850,
            "carrelage_m2": 22_000,
            "toiture_m2": 30_000,
            "peinture_litre": 11_000,
            "main_oeuvre_journalier": 9_000,
        },
    },
    # ── AFRIQUE (suite) ──────────────────────
    {
        "country_code": "MA",
        "country_name": "Maroc",
        "currency": "MAD",
        "eur_rate": 10.85,
        "cost_economique_m2": 4_500,
        "cost_standard_m2": 7_000,
        "cost_premium_m2": 12_000,
        "materials": {
            "ciment_sac_50kg": 75,
            "fer_beton_kg": 8,
            "sable_m3": 150,
            "gravier_m3": 200,
            "brique_unite": 3,
            "carrelage_m2": 90,
            "toiture_m2": 130,
            "peinture_litre": 45,
            "main_oeuvre_journalier": 180,
        },
    },
    {
        "country_code": "TN",
        "country_name": "Tunisie",
        "currency": "TND",
        "eur_rate": 3.35,
        "cost_economique_m2": 1_400,
        "cost_standard_m2": 2_200,
        "cost_premium_m2": 3_800,
        "materials": {
            "ciment_sac_50kg": 24,
            "fer_beton_kg": 2.8,
            "sable_m3": 55,
            "gravier_m3": 70,
            "brique_unite": 0.9,
            "carrelage_m2": 28,
            "toiture_m2": 45,
            "peinture_litre": 14,
            "main_oeuvre_journalier": 60,
        },
    },
    {
        "country_code": "NG",
        "country_name": "Nigeria",
        "currency": "NGN",
        "eur_rate": 1_620.0,
        "cost_economique_m2": 250_000,
        "cost_standard_m2": 420_000,
        "cost_premium_m2": 750_000,
        "materials": {
            "ciment_sac_50kg": 9_500,
            "fer_beton_kg": 900,
            "sable_m3": 25_000,
            "gravier_m3": 35_000,
            "brique_unite": 600,
            "carrelage_m2": 12_000,
            "toiture_m2": 18_000,
            "peinture_litre": 7_000,
            "main_oeuvre_journalier": 8_000,
        },
    },
    {
        "country_code": "GH",
        "country_name": "Ghana",
        "currency": "GHS",
        "eur_rate": 15.8,
        "cost_economique_m2": 1_800,
        "cost_standard_m2": 2_900,
        "cost_premium_m2": 5_200,
        "materials": {
            "ciment_sac_50kg": 68,
            "fer_beton_kg": 7.5,
            "sable_m3": 180,
            "gravier_m3": 240,
            "brique_unite": 4.5,
            "carrelage_m2": 85,
            "toiture_m2": 120,
            "peinture_litre": 42,
            "main_oeuvre_journalier": 55,
        },
    },
    {
        "country_code": "MG",
        "country_name": "Madagascar",
        "currency": "MGA",
        "eur_rate": 4_700.0,
        "cost_economique_m2": 700_000,
        "cost_standard_m2": 1_100_000,
        "cost_premium_m2": 2_000_000,
        "materials": {
            "ciment_sac_50kg": 28_000,
            "fer_beton_kg": 2_800,
            "sable_m3": 60_000,
            "gravier_m3": 85_000,
            "brique_unite": 1_800,
            "carrelage_m2": 35_000,
            "toiture_m2": 50_000,
            "peinture_litre": 18_000,
            "main_oeuvre_journalier": 15_000,
        },
    },
    # ── EUROPE ──────────────────────────────
    {
        "country_code": "FR",
        "country_name": "France",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_500,
        "cost_standard_m2": 2_200,
        "cost_premium_m2": 3_800,
        "materials": {
            "ciment_sac_50kg": 12,
            "fer_beton_kg": 1.1,
            "sable_m3": 35,
            "gravier_m3": 45,
            "brique_unite": 1.2,
            "carrelage_m2": 35,
            "toiture_m2": 80,
            "peinture_litre": 18,
            "main_oeuvre_journalier": 280,
        },
    },
    {
        "country_code": "CH",
        "country_name": "Suisse",
        "currency": "CHF",
        "eur_rate": 0.97,
        "cost_economique_m2": 3_800,
        "cost_standard_m2": 5_500,
        "cost_premium_m2": 9_000,
        "materials": {
            "ciment_sac_50kg": 22,
            "fer_beton_kg": 2.0,
            "sable_m3": 65,
            "gravier_m3": 85,
            "brique_unite": 2.2,
            "carrelage_m2": 65,
            "toiture_m2": 150,
            "peinture_litre": 32,
            "main_oeuvre_journalier": 520,
        },
    },
    {
        "country_code": "BE",
        "country_name": "Belgique",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_400,
        "cost_standard_m2": 2_000,
        "cost_premium_m2": 3_500,
        "materials": {
            "ciment_sac_50kg": 11,
            "fer_beton_kg": 1.0,
            "sable_m3": 32,
            "gravier_m3": 42,
            "brique_unite": 0.95,
            "carrelage_m2": 30,
            "toiture_m2": 75,
            "peinture_litre": 16,
            "main_oeuvre_journalier": 260,
        },
    },
    {
        "country_code": "PT",
        "country_name": "Portugal",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 900,
        "cost_standard_m2": 1_400,
        "cost_premium_m2": 2_400,
        "materials": {
            "ciment_sac_50kg": 8,
            "fer_beton_kg": 0.85,
            "sable_m3": 22,
            "gravier_m3": 28,
            "brique_unite": 0.65,
            "carrelage_m2": 22,
            "toiture_m2": 55,
            "peinture_litre": 12,
            "main_oeuvre_journalier": 160,
        },
    },
    {
        "country_code": "ES",
        "country_name": "Espagne",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_000,
        "cost_standard_m2": 1_600,
        "cost_premium_m2": 2_800,
        "materials": {
            "ciment_sac_50kg": 9,
            "fer_beton_kg": 0.90,
            "sable_m3": 25,
            "gravier_m3": 32,
            "brique_unite": 0.70,
            "carrelage_m2": 25,
            "toiture_m2": 60,
            "peinture_litre": 13,
            "main_oeuvre_journalier": 175,
        },
    },
    {
        "country_code": "DE",
        "country_name": "Allemagne",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_800,
        "cost_standard_m2": 2_600,
        "cost_premium_m2": 4_200,
        "materials": {
            "ciment_sac_50kg": 14,
            "fer_beton_kg": 1.2,
            "sable_m3": 38,
            "gravier_m3": 50,
            "brique_unite": 1.1,
            "carrelage_m2": 38,
            "toiture_m2": 90,
            "peinture_litre": 20,
            "main_oeuvre_journalier": 320,
        },
    },
    {
        "country_code": "GB",
        "country_name": "Royaume-Uni",
        "currency": "GBP",
        "eur_rate": 0.86,
        "cost_economique_m2": 1_800,
        "cost_standard_m2": 2_800,
        "cost_premium_m2": 5_000,
        "materials": {
            "ciment_sac_50kg": 14,
            "fer_beton_kg": 1.3,
            "sable_m3": 42,
            "gravier_m3": 55,
            "brique_unite": 1.0,
            "carrelage_m2": 40,
            "toiture_m2": 95,
            "peinture_litre": 22,
            "main_oeuvre_journalier": 350,
        },
    },
    {
        "country_code": "IT",
        "country_name": "Italie",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_100,
        "cost_standard_m2": 1_700,
        "cost_premium_m2": 3_000,
        "materials": {
            "ciment_sac_50kg": 10,
            "fer_beton_kg": 0.95,
            "sable_m3": 28,
            "gravier_m3": 36,
            "brique_unite": 0.80,
            "carrelage_m2": 28,
            "toiture_m2": 65,
            "peinture_litre": 14,
            "main_oeuvre_journalier": 200,
        },
    },
    # ── AMÉRIQUES ────────────────────────────
    {
        "country_code": "CA",
        "country_name": "Canada",
        "currency": "CAD",
        "eur_rate": 1.52,
        "cost_economique_m2": 2_200,
        "cost_standard_m2": 3_400,
        "cost_premium_m2": 6_000,
        "materials": {
            "ciment_sac_50kg": 22,
            "fer_beton_kg": 2.0,
            "sable_m3": 55,
            "gravier_m3": 70,
            "brique_unite": 1.8,
            "carrelage_m2": 50,
            "toiture_m2": 110,
            "peinture_litre": 28,
            "main_oeuvre_journalier": 400,
        },
    },
    {
        "country_code": "US",
        "country_name": "États-Unis",
        "currency": "USD",
        "eur_rate": 1.09,
        "cost_economique_m2": 1_600,
        "cost_standard_m2": 2_500,
        "cost_premium_m2": 5_000,
        "materials": {
            "ciment_sac_50kg": 16,
            "fer_beton_kg": 1.5,
            "sable_m3": 45,
            "gravier_m3": 60,
            "brique_unite": 1.5,
            "carrelage_m2": 45,
            "toiture_m2": 100,
            "peinture_litre": 25,
            "main_oeuvre_journalier": 380,
        },
    },
    {
        "country_code": "BR",
        "country_name": "Brésil",
        "currency": "BRL",
        "eur_rate": 5.50,
        "cost_economique_m2": 2_800,
        "cost_standard_m2": 4_500,
        "cost_premium_m2": 8_500,
        "materials": {
            "ciment_sac_50kg": 45,
            "fer_beton_kg": 4.5,
            "sable_m3": 120,
            "gravier_m3": 160,
            "brique_unite": 0.90,
            "carrelage_m2": 80,
            "toiture_m2": 180,
            "peinture_litre": 55,
            "main_oeuvre_journalier": 180,
        },
    },
    {
        "country_code": "HT",
        "country_name": "Haïti",
        "currency": "HTG",
        "eur_rate": 148.0,
        "cost_economique_m2": 55_000,
        "cost_standard_m2": 90_000,
        "cost_premium_m2": 160_000,
        "materials": {
            "ciment_sac_50kg": 2_200,
            "fer_beton_kg": 210,
            "sable_m3": 5_500,
            "gravier_m3": 7_500,
            "brique_unite": 45,
            "carrelage_m2": 3_800,
            "toiture_m2": 8_000,
            "peinture_litre": 2_600,
            "main_oeuvre_journalier": 1_200,
        },
    },
    {
        "country_code": "MQ",
        "country_name": "Martinique",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_800,
        "cost_standard_m2": 2_700,
        "cost_premium_m2": 4_500,
        "materials": {
            "ciment_sac_50kg": 18,
            "fer_beton_kg": 1.6,
            "sable_m3": 50,
            "gravier_m3": 65,
            "brique_unite": 1.5,
            "carrelage_m2": 45,
            "toiture_m2": 100,
            "peinture_litre": 25,
            "main_oeuvre_journalier": 300,
        },
    },
    {
        "country_code": "GP",
        "country_name": "Guadeloupe",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_750,
        "cost_standard_m2": 2_600,
        "cost_premium_m2": 4_400,
        "materials": {
            "ciment_sac_50kg": 17,
            "fer_beton_kg": 1.55,
            "sable_m3": 48,
            "gravier_m3": 62,
            "brique_unite": 1.4,
            "carrelage_m2": 43,
            "toiture_m2": 95,
            "peinture_litre": 24,
            "main_oeuvre_journalier": 295,
        },
    },
    {
        "country_code": "MX",
        "country_name": "Mexique",
        "currency": "MXN",
        "eur_rate": 19.5,
        "cost_economique_m2": 10_000,
        "cost_standard_m2": 16_000,
        "cost_premium_m2": 30_000,
        "materials": {
            "ciment_sac_50kg": 180,
            "fer_beton_kg": 18,
            "sable_m3": 480,
            "gravier_m3": 640,
            "brique_unite": 5.5,
            "carrelage_m2": 320,
            "toiture_m2": 700,
            "peinture_litre": 220,
            "main_oeuvre_journalier": 700,
        },
    },
    # ── ASIE ─────────────────────────────────
    {
        "country_code": "VN",
        "country_name": "Vietnam",
        "currency": "VND",
        "eur_rate": 27_000.0,
        "cost_economique_m2": 8_000_000,
        "cost_standard_m2": 13_000_000,
        "cost_premium_m2": 25_000_000,
        "materials": {
            "ciment_sac_50kg": 90_000,
            "fer_beton_kg": 18_000,
            "sable_m3": 280_000,
            "gravier_m3": 380_000,
            "brique_unite": 3_500,
            "carrelage_m2": 250_000,
            "toiture_m2": 450_000,
            "peinture_litre": 120_000,
            "main_oeuvre_journalier": 320_000,
        },
    },
    {
        "country_code": "IN",
        "country_name": "Inde",
        "currency": "INR",
        "eur_rate": 91.0,
        "cost_economique_m2": 25_000,
        "cost_standard_m2": 40_000,
        "cost_premium_m2": 80_000,
        "materials": {
            "ciment_sac_50kg": 380,
            "fer_beton_kg": 65,
            "sable_m3": 1_200,
            "gravier_m3": 1_600,
            "brique_unite": 12,
            "carrelage_m2": 900,
            "toiture_m2": 2_000,
            "peinture_litre": 550,
            "main_oeuvre_journalier": 900,
        },
    },
    {
        "country_code": "AE",
        "country_name": "Émirats Arabes Unis",
        "currency": "AED",
        "eur_rate": 4.0,
        "cost_economique_m2": 3_500,
        "cost_standard_m2": 6_000,
        "cost_premium_m2": 12_000,
        "materials": {
            "ciment_sac_50kg": 45,
            "fer_beton_kg": 4.5,
            "sable_m3": 110,
            "gravier_m3": 150,
            "brique_unite": 2.5,
            "carrelage_m2": 120,
            "toiture_m2": 280,
            "peinture_litre": 75,
            "main_oeuvre_journalier": 250,
        },
    },
    {
        "country_code": "CN",
        "country_name": "Chine",
        "currency": "CNY",
        "eur_rate": 7.85,
        "cost_economique_m2": 3_500,
        "cost_standard_m2": 6_000,
        "cost_premium_m2": 11_000,
        "materials": {
            "ciment_sac_50kg": 35,
            "fer_beton_kg": 4.2,
            "sable_m3": 100,
            "gravier_m3": 135,
            "brique_unite": 1.5,
            "carrelage_m2": 85,
            "toiture_m2": 200,
            "peinture_litre": 55,
            "main_oeuvre_journalier": 300,
        },
    },
    # ── OCÉANIE ──────────────────────────────
    {
        "country_code": "AU",
        "country_name": "Australie",
        "currency": "AUD",
        "eur_rate": 1.68,
        "cost_economique_m2": 2_800,
        "cost_standard_m2": 4_200,
        "cost_premium_m2": 7_500,
        "materials": {
            "ciment_sac_50kg": 30,
            "fer_beton_kg": 2.8,
            "sable_m3": 75,
            "gravier_m3": 100,
            "brique_unite": 2.2,
            "carrelage_m2": 60,
            "toiture_m2": 130,
            "peinture_litre": 38,
            "main_oeuvre_journalier": 600,
        },
    },
    {
        "country_code": "NZ",
        "country_name": "Nouvelle-Zélande",
        "currency": "NZD",
        "eur_rate": 1.85,
        "cost_economique_m2": 3_200,
        "cost_standard_m2": 4_800,
        "cost_premium_m2": 8_500,
        "materials": {
            "ciment_sac_50kg": 32,
            "fer_beton_kg": 3.0,
            "sable_m3": 80,
            "gravier_m3": 108,
            "brique_unite": 2.4,
            "carrelage_m2": 65,
            "toiture_m2": 140,
            "peinture_litre": 40,
            "main_oeuvre_journalier": 620,
        },
    },
    # ── AFRIQUE (complément) ─────────────────
    {
        "country_code": "GA",
        "country_name": "Gabon",
        "currency": "XAF",
        "eur_rate": 655.957,
        "cost_economique_m2": 210_000,
        "cost_standard_m2": 340_000,
        "cost_premium_m2": 600_000,
        "materials": {
            "ciment_sac_50kg": 9_000,
            "fer_beton_kg": 750,
            "sable_m3": 18_000,
            "gravier_m3": 24_000,
            "brique_unite": 420,
            "carrelage_m2": 10_000,
            "toiture_m2": 15_000,
            "peinture_litre": 5_500,
            "main_oeuvre_journalier": 7_000,
        },
    },
    {
        "country_code": "CG",
        "country_name": "République du Congo",
        "currency": "XAF",
        "eur_rate": 655.957,
        "cost_economique_m2": 195_000,
        "cost_standard_m2": 310_000,
        "cost_premium_m2": 560_000,
        "materials": {
            "ciment_sac_50kg": 8_500,
            "fer_beton_kg": 720,
            "sable_m3": 17_000,
            "gravier_m3": 23_000,
            "brique_unite": 400,
            "carrelage_m2": 9_800,
            "toiture_m2": 14_500,
            "peinture_litre": 5_200,
            "main_oeuvre_journalier": 6_500,
        },
    },
    {
        "country_code": "NE",
        "country_name": "Niger",
        "currency": "XOF",
        "eur_rate": 655.957,
        "cost_economique_m2": 140_000,
        "cost_standard_m2": 210_000,
        "cost_premium_m2": 380_000,
        "materials": {
            "ciment_sac_50kg": 6_000,
            "fer_beton_kg": 540,
            "sable_m3": 10_500,
            "gravier_m3": 14_500,
            "brique_unite": 250,
            "carrelage_m2": 6_200,
            "toiture_m2": 8_800,
            "peinture_litre": 3_400,
            "main_oeuvre_journalier": 3_000,
        },
    },
    {
        "country_code": "RE",
        "country_name": "La Réunion",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_700,
        "cost_standard_m2": 2_500,
        "cost_premium_m2": 4_200,
        "materials": {
            "ciment_sac_50kg": 16,
            "fer_beton_kg": 1.5,
            "sable_m3": 48,
            "gravier_m3": 62,
            "brique_unite": 1.4,
            "carrelage_m2": 42,
            "toiture_m2": 95,
            "peinture_litre": 23,
            "main_oeuvre_journalier": 280,
        },
    },
    # ── AMÉRIQUES (complément) ───────────────
    {
        "country_code": "GF",
        "country_name": "Guyane française",
        "currency": "EUR",
        "eur_rate": 1.0,
        "cost_economique_m2": 1_600,
        "cost_standard_m2": 2_400,
        "cost_premium_m2": 4_000,
        "materials": {
            "ciment_sac_50kg": 15,
            "fer_beton_kg": 1.45,
            "sable_m3": 45,
            "gravier_m3": 58,
            "brique_unite": 1.3,
            "carrelage_m2": 40,
            "toiture_m2": 90,
            "peinture_litre": 22,
            "main_oeuvre_journalier": 270,
        },
    },
    {
        "country_code": "AR",
        "country_name": "Argentine",
        "currency": "ARS",
        "eur_rate": 1_000.0,
        "cost_economique_m2": 450_000,
        "cost_standard_m2": 720_000,
        "cost_premium_m2": 1_400_000,
        "materials": {
            "ciment_sac_50kg": 8_500,
            "fer_beton_kg": 900,
            "sable_m3": 22_000,
            "gravier_m3": 30_000,
            "brique_unite": 120,
            "carrelage_m2": 15_000,
            "toiture_m2": 35_000,
            "peinture_litre": 10_000,
            "main_oeuvre_journalier": 18_000,
        },
    },
    # ── ASIE (complément) ────────────────────
    {
        "country_code": "LB",
        "country_name": "Liban",
        "currency": "USD",
        "eur_rate": 1.09,
        "cost_economique_m2": 600,
        "cost_standard_m2": 1_000,
        "cost_premium_m2": 2_000,
        "materials": {
            "ciment_sac_50kg": 12,
            "fer_beton_kg": 1.2,
            "sable_m3": 35,
            "gravier_m3": 48,
            "brique_unite": 1.1,
            "carrelage_m2": 28,
            "toiture_m2": 70,
            "peinture_litre": 18,
            "main_oeuvre_journalier": 60,
        },
    },
    {
        "country_code": "QA",
        "country_name": "Qatar",
        "currency": "QAR",
        "eur_rate": 3.97,
        "cost_economique_m2": 2_800,
        "cost_standard_m2": 5_000,
        "cost_premium_m2": 10_000,
        "materials": {
            "ciment_sac_50kg": 38,
            "fer_beton_kg": 4.0,
            "sable_m3": 95,
            "gravier_m3": 130,
            "brique_unite": 2.2,
            "carrelage_m2": 100,
            "toiture_m2": 240,
            "peinture_litre": 65,
            "main_oeuvre_journalier": 200,
        },
    },
    {
        "country_code": "SG",
        "country_name": "Singapour",
        "currency": "SGD",
        "eur_rate": 1.46,
        "cost_economique_m2": 3_500,
        "cost_standard_m2": 5_500,
        "cost_premium_m2": 10_000,
        "materials": {
            "ciment_sac_50kg": 38,
            "fer_beton_kg": 3.8,
            "sable_m3": 95,
            "gravier_m3": 130,
            "brique_unite": 2.0,
            "carrelage_m2": 95,
            "toiture_m2": 220,
            "peinture_litre": 62,
            "main_oeuvre_journalier": 450,
        },
    },
    {
        "country_code": "JP",
        "country_name": "Japon",
        "currency": "JPY",
        "eur_rate": 162.0,
        "cost_economique_m2": 280_000,
        "cost_standard_m2": 430_000,
        "cost_premium_m2": 800_000,
        "materials": {
            "ciment_sac_50kg": 2_800,
            "fer_beton_kg": 320,
            "sable_m3": 7_500,
            "gravier_m3": 10_000,
            "brique_unite": 180,
            "carrelage_m2": 7_500,
            "toiture_m2": 18_000,
            "peinture_litre": 5_000,
            "main_oeuvre_journalier": 35_000,
        },
    },
]


def seed_countries(db: Session):
    """Insère les données pays si elles n'existent pas."""
    for data in AFRICAN_COUNTRIES_SEED:
        existing = db.query(CountryData).filter_by(country_code=data["country_code"]).first()
        if not existing:
            db.add(CountryData(**data))
    db.commit()


# ─────────────────────────────────────────────
# AUTH HELPERS
# ─────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide ou expiré")


# ─────────────────────────────────────────────
# DB DEPENDENCY
# ─────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou inactif")
    return user


def require_subscription(current_user: User = Depends(get_current_user)) -> User:
    """Vérifie que l'utilisateur a un abonnement actif."""
    sub = current_user.subscription
    if not sub or not sub.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Abonnement requis pour accéder à cette fonctionnalité",
        )
    return current_user


# ─────────────────────────────────────────────
# SCHEMAS Pydantic
# ─────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    country: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    plan: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    country: Optional[str]
    is_active: bool
    plan: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    country: str                          # code ISO2 ex: "SN"
    city: Optional[str] = None
    project_type: str                     # villa / appartement / commerce / entrepot
    surface_m2: float
    floors: int = 1
    quality_level: str = "standard"      # economique / standard / premium


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    project_type: Optional[str] = None
    surface_m2: Optional[float] = None
    floors: Optional[int] = None
    quality_level: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    country: str
    city: Optional[str]
    project_type: str
    surface_m2: float
    floors: int
    quality_level: str
    estimated_cost_local: Optional[float]
    estimated_cost_eur: Optional[float]
    currency: Optional[str]
    materials_detail: Optional[dict]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EstimationOut(BaseModel):
    country: str
    country_name: str
    currency: str
    surface_m2: float
    floors: int
    quality_level: str
    cost_per_m2_local: float
    total_cost_local: float
    total_cost_eur: float
    materials_reference: dict
    disclaimer: str


class CheckoutRequest(BaseModel):
    plan: str   # PRO / ELITE / ELITE_AFRIQUE


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class SubscriptionOut(BaseModel):
    plan: str
    is_active: bool
    current_period_end: Optional[datetime]


class CountryOut(BaseModel):
    country_code: str
    country_name: str
    currency: str
    cost_economique_m2: float
    cost_standard_m2: float
    cost_premium_m2: float
    materials: Optional[dict]

    class Config:
        from_attributes = True


# ── Schémas modules professionnels ───────────────────────────────────────────

class DXFExportRequest(BaseModel):
    width: float = 10.0          # largeur en mètres
    length: float = 12.0         # longueur en mètres
    floors: int = 1
    project_name: str = "Plan PHG"
    rooms: Optional[List[dict]] = None  # [{name, x, y, w, h}] en mètres

class SupplierOut(BaseModel):
    id: int
    name: str
    country: str
    category: str
    contact: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    min_order_amount: Optional[float]
    delivery_days: Optional[int]
    rating: float
    price_level: str
    is_verified: bool
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    supplier_id: Optional[int] = None
    supplier_name: str
    items: List[dict]            # [{name, qty, unit, unit_price}]
    total_amount: float
    currency: str = "EUR"
    notes: Optional[str] = None

class OrderOut(BaseModel):
    id: int
    supplier_name: str
    items: List[dict]
    total_amount: float
    currency: str
    status: str
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class ChantierCreate(BaseModel):
    name: str
    location: Optional[str] = None
    project_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None

class ChantierOut(BaseModel):
    id: int
    name: str
    location: Optional[str]
    project_id: Optional[int]
    start_date: Optional[str]
    end_date: Optional[str]
    budget: Optional[float]
    spent: float
    progress: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    category: Optional[str] = None
    week: Optional[int] = None
    status: str = "planifie"
    assigned_to: Optional[str] = None
    budget: Optional[float] = None
    notes: Optional[str] = None

class TaskOut(BaseModel):
    id: int
    title: str
    category: Optional[str]
    week: Optional[int]
    status: str
    assigned_to: Optional[str]
    budget: Optional[float]
    paid: float
    notes: Optional[str]
    class Config:
        from_attributes = True

class WorkerCreate(BaseModel):
    name: str
    role: Optional[str] = None
    daily_rate: Optional[float] = None
    phone: Optional[str] = None

class WorkerOut(BaseModel):
    id: int
    name: str
    role: Optional[str]
    daily_rate: Optional[float]
    phone: Optional[str]
    present_days: int
    absent_days: int
    total_paid: float
    class Config:
        from_attributes = True

class WorkerAttendance(BaseModel):
    present: bool
    amount: Optional[float] = None


# ─────────────────────────────────────────────
# LOGIQUE ESTIMATION
# ─────────────────────────────────────────────
FLOOR_MULTIPLIER = {1: 1.0, 2: 1.85, 3: 2.65, 4: 3.40}
PROJECT_TYPE_FACTOR = {
    "villa": 1.0,
    "appartement": 0.90,
    "commerce": 1.10,
    "entrepot": 0.75,
    "bureau": 1.05,
}


def compute_estimation(
    country_data: CountryData,
    surface_m2: float,
    floors: int,
    quality_level: str,
    project_type: str,
) -> dict:
    cost_map = {
        "economique": country_data.cost_economique_m2,
        "standard": country_data.cost_standard_m2,
        "premium": country_data.cost_premium_m2,
    }
    base_cost_m2 = cost_map.get(quality_level, country_data.cost_standard_m2)
    floor_mult = FLOOR_MULTIPLIER.get(min(floors, 4), 1.0 + (floors - 1) * 0.75)
    type_factor = PROJECT_TYPE_FACTOR.get(project_type, 1.0)

    total_surface = surface_m2 * floors
    total_local = base_cost_m2 * total_surface * type_factor * floor_mult
    total_eur = total_local / country_data.eur_rate

    materials_detail = {}
    if country_data.materials:
        for mat, price in country_data.materials.items():
            materials_detail[mat] = {
                "prix_unitaire": price,
                "devise": country_data.currency,
            }

    return {
        "cost_per_m2_local": base_cost_m2,
        "total_cost_local": round(total_local, 2),
        "total_cost_eur": round(total_eur, 2),
        "currency": country_data.currency,
        "materials_reference": materials_detail,
    }


# ─────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    # ── Démarrage ──────────────────────────────
    # create_all est idempotent : crée uniquement les tables absentes.
    # En production avec Alembic, alembic upgrade head prend le relais.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_countries(db)
        seed_suppliers(db)
    finally:
        db.close()
    yield
    # ── Arrêt ──────────────────────────────────
    engine.dispose()

app = FastAPI(
    title="PHG BUILD IA API",
    description="Plateforme de construction intelligente pour la diaspora africaine francophone",
    version="2.0.0",
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://frontend-goulia-s-projects.vercel.app",
    FRONTEND_URL,
    *([o for o in os.getenv("EXTRA_CORS_ORIGINS", "").split(",") if o]),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Handler global : ajoute les headers CORS même sur les erreurs 500
# Sans ça, le navigateur affiche "CORS blocked" à la place du vrai message d'erreur
from fastapi.responses import JSONResponse
from starlette.requests import Request as StarletteRequest

@app.exception_handler(Exception)
async def global_exception_handler(request: StarletteRequest, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )


# ─────────────────────────────────────────────
# ROUTES AUTH
# ─────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse, tags=["Auth"])
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        country=payload.country,
    )
    db.add(user)
    db.flush()

    # Plan gratuit par défaut
    sub = Subscription(user_id=user.id, plan="FREE", is_active=False)
    db.add(sub)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        plan="FREE",
    )


@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    plan = user.subscription.plan if user.subscription else "FREE"
    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        plan=plan,
    )


@app.get("/auth/me", response_model=UserOut, tags=["Auth"])
def me(current_user: User = Depends(get_current_user)):
    plan = current_user.subscription.plan if current_user.subscription else None
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        country=current_user.country,
        is_active=current_user.is_active,
        plan=plan,
        created_at=current_user.created_at,
    )


# ─────────────────────────────────────────────
# ROUTES PAYS
# ─────────────────────────────────────────────
@app.get("/countries", response_model=List[CountryOut], tags=["Pays"])
def list_countries(db: Session = Depends(get_db)):
    return db.query(CountryData).all()


@app.get("/countries/{country_code}", response_model=CountryOut, tags=["Pays"])
def get_country(country_code: str, db: Session = Depends(get_db)):
    c = db.query(CountryData).filter(CountryData.country_code == country_code.upper()).first()
    if not c:
        raise HTTPException(status_code=404, detail="Pays non trouvé")
    return c


# ─────────────────────────────────────────────
# ROUTES PROJETS
# ─────────────────────────────────────────────
@app.get("/projects", response_model=List[ProjectOut], tags=["Projets"])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.owner_id == current_user.id).order_by(Project.created_at.desc()).all()


@app.post("/projects", response_model=ProjectOut, tags=["Projets"])
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    country_data = db.query(CountryData).filter(CountryData.country_code == payload.country.upper()).first()
    if not country_data:
        raise HTTPException(status_code=404, detail=f"Pays '{payload.country}' non supporté")

    est = compute_estimation(
        country_data,
        payload.surface_m2,
        payload.floors,
        payload.quality_level,
        payload.project_type,
    )

    project = Project(
        title=payload.title,
        description=payload.description,
        country=payload.country.upper(),
        city=payload.city,
        project_type=payload.project_type,
        surface_m2=payload.surface_m2,
        floors=payload.floors,
        quality_level=payload.quality_level,
        estimated_cost_local=est["total_cost_local"],
        estimated_cost_eur=est["total_cost_eur"],
        currency=est["currency"],
        materials_detail=est["materials_reference"],
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects/{project_id}", response_model=ProjectOut, tags=["Projets"])
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@app.put("/projects/{project_id}", response_model=ProjectOut, tags=["Projets"])
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    # Recalcul si surface / étages / qualité / type changés
    recalc_fields = {"surface_m2", "floors", "quality_level", "project_type"}
    if recalc_fields & set(update_data.keys()):
        country_data = db.query(CountryData).filter(CountryData.country_code == project.country).first()
        if country_data:
            est = compute_estimation(
                country_data, project.surface_m2, project.floors,
                project.quality_level, project.project_type,
            )
            project.estimated_cost_local = est["total_cost_local"]
            project.estimated_cost_eur = est["total_cost_eur"]
            project.currency = est["currency"]
            project.materials_detail = est["materials_reference"]

    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}", tags=["Projets"])
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(project)
    db.commit()
    return {"detail": "Projet supprimé"}


@app.get("/projects/{project_id}/estimation", response_model=EstimationOut, tags=["Projets"])
def get_estimation(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retourne l'estimation détaillée d'un projet."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    country_data = db.query(CountryData).filter(CountryData.country_code == project.country).first()
    if not country_data:
        raise HTTPException(status_code=404, detail="Données pays introuvables")

    est = compute_estimation(
        country_data, project.surface_m2, project.floors,
        project.quality_level, project.project_type,
    )

    return EstimationOut(
        country=project.country,
        country_name=country_data.country_name,
        currency=country_data.currency,
        surface_m2=project.surface_m2,
        floors=project.floors,
        quality_level=project.quality_level,
        cost_per_m2_local=est["cost_per_m2_local"],
        total_cost_local=est["total_cost_local"],
        total_cost_eur=est["total_cost_eur"],
        materials_reference=est["materials_reference"],
        disclaimer="Estimation indicative. Les prix réels peuvent varier selon les fournisseurs locaux et la période.",
    )


@app.post("/estimate", response_model=EstimationOut, tags=["Projets"])
def quick_estimate(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
):
    """Estimation rapide sans authentification (fonctionnalité découverte)."""
    country_data = db.query(CountryData).filter(CountryData.country_code == payload.country.upper()).first()
    if not country_data:
        raise HTTPException(status_code=404, detail=f"Pays '{payload.country}' non supporté")

    est = compute_estimation(
        country_data, payload.surface_m2, payload.floors,
        payload.quality_level, payload.project_type,
    )

    return EstimationOut(
        country=payload.country.upper(),
        country_name=country_data.country_name,
        currency=country_data.currency,
        surface_m2=payload.surface_m2,
        floors=payload.floors,
        quality_level=payload.quality_level,
        cost_per_m2_local=est["cost_per_m2_local"],
        total_cost_local=est["total_cost_local"],
        total_cost_eur=est["total_cost_eur"],
        materials_reference=est["materials_reference"],
        disclaimer="Estimation indicative. Connectez-vous pour sauvegarder vos projets et accéder aux fonctionnalités avancées.",
    )


# ─────────────────────────────────────────────
# ROUTES STRIPE
# ─────────────────────────────────────────────
@app.get("/plans", tags=["Abonnements"])
def list_plans():
    return [
        {
            "id": plan_id,
            "name": plan["name"],
            "price_euros": plan["price_euros"],
            "description": plan["description"],
        }
        for plan_id, plan in STRIPE_PLANS.items()
    ]


@app.post("/stripe/checkout", response_model=CheckoutResponse, tags=["Abonnements"])
def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan_key = payload.plan.upper()
    if plan_key not in STRIPE_PLANS:
        raise HTTPException(status_code=400, detail=f"Plan '{payload.plan}' invalide. Choisir : PRO, ELITE, ELITE_AFRIQUE")

    plan = STRIPE_PLANS[plan_key]

    # Créer ou récupérer le customer Stripe
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"user_id": current_user.id},
        )
        current_user.stripe_customer_id = customer.id
        db.commit()

    try:
        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": plan["price_id"], "quantity": 1}],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/dashboard?checkout=success&plan={plan_key}",
            cancel_url=f"{FRONTEND_URL}/pricing?checkout=cancelled",
            metadata={
                "user_id": str(current_user.id),
                "plan": plan_key,
            },
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id),
                    "plan": plan_key,
                }
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur Stripe : {str(e)}")

    # Enregistrer la session en attente
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if sub:
        sub.stripe_checkout_session_id = session.id
        sub.plan = plan_key
        db.commit()

    return CheckoutResponse(checkout_url=session.url, session_id=session.id)


@app.post("/stripe/webhook", tags=["Abonnements"])
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Webhook Stripe — gère les événements d'abonnement."""
    body = await request.body()

    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature Stripe invalide")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = SessionLocal()
    try:
        _handle_stripe_event(event, db)
    finally:
        db.close()

    return {"received": True}


def _handle_stripe_event(event: dict, db: Session):
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = int(data.get("metadata", {}).get("user_id", 0))
        plan = data.get("metadata", {}).get("plan", "PRO")
        stripe_sub_id = data.get("subscription")

        if user_id:
            sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if sub:
                sub.plan = plan
                sub.stripe_subscription_id = stripe_sub_id
                sub.is_active = True
                sub.updated_at = datetime.now(timezone.utc)
                db.commit()

    elif event_type == "customer.subscription.updated":
        stripe_sub_id = data.get("id")
        status = data.get("status")
        period_end = data.get("current_period_end")

        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub_id
        ).first()
        if sub:
            sub.is_active = status in ("active", "trialing")
            if period_end:
                sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
            sub.updated_at = datetime.now(timezone.utc)
            db.commit()

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        stripe_sub_id = data.get("id")
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub_id
        ).first()
        if sub:
            sub.is_active = False
            sub.updated_at = datetime.now(timezone.utc)
            db.commit()

    elif event_type == "invoice.payment_failed":
        stripe_sub_id = data.get("subscription")
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub_id
        ).first()
        if sub:
            sub.is_active = False
            sub.updated_at = datetime.now(timezone.utc)
            db.commit()


@app.get("/subscription/me", response_model=SubscriptionOut, tags=["Abonnements"])
def my_subscription(current_user: User = Depends(get_current_user)):
    sub = current_user.subscription
    if not sub:
        return SubscriptionOut(plan="FREE", is_active=False, current_period_end=None)
    return SubscriptionOut(
        plan=sub.plan,
        is_active=sub.is_active,
        current_period_end=sub.current_period_end,
    )


# ─────────────────────────────────────────────
# ENDPOINTS DASHBOARD (compat Dashboard.jsx)
# ─────────────────────────────────────────────
@app.get("/mobile/dashboard", tags=["Dashboard"])
def mobile_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stats dashboard pour l'utilisateur connecté."""
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    sub = current_user.subscription
    total_cost = sum(p.estimated_cost_eur or 0 for p in projects)
    return {
        "user": {"id": current_user.id, "full_name": current_user.full_name, "email": current_user.email},
        "stats": {
            "total_projects": len(projects),
            "estimated_projects": sum(1 for p in projects if p.status == "completed"),
            "draft_projects": sum(1 for p in projects if p.status == "draft"),
            "total_cost_eur": round(total_cost, 2),
        },
        "subscription": {
            "plan": sub.plan if sub else "FREE",
            "is_active": sub.is_active if sub else False,
        },
    }


@app.get("/mobile/plans", tags=["Dashboard"])
def mobile_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Liste des projets avec leurs estimations — format Dashboard."""
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return [
        {
            "project_id": p.id,
            "project_name": p.title,
            "project_type": p.project_type,
            "country": p.country,
            "estimated_total_cost": p.estimated_cost_eur,
            "currency": "EUR",
            "quality_level": p.quality_level,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]


@app.get("/subscriptions", tags=["Abonnements"])
def list_subscriptions(current_user: User = Depends(get_current_user)):
    """Abonnement de l'utilisateur connecté (format Dashboard)."""
    sub = current_user.subscription
    if not sub:
        return []
    return [{
        "plan_name": sub.plan,
        "is_active": sub.is_active,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "stripe_subscription_id": sub.stripe_subscription_id,
    }]


@app.get("/clients", tags=["Dashboard"])
def list_clients(current_user: User = Depends(get_current_user)):
    """Stub clients — à développer ultérieurement."""
    return []


@app.post("/clients", tags=["Dashboard"])
def create_client(current_user: User = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Fonctionnalité clients à venir")


# ─────────────────────────────────────────────
# SANTÉ
# ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    """Healthcheck léger — pas de connexion DB, répond toujours 200."""
    return {"status": "ok", "service": "PHG BUILD IA API", "version": "2.0.0"}


@app.get("/health/db", tags=["System"])
def health_db(db: Session = Depends(get_db)):
    """Healthcheck DB — vérifie la connexion PostgreSQL."""
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {str(e)}")


# ─────────────────────────────────────────────
# MODULE 1 — EXPORT DXF
# ─────────────────────────────────────────────
@app.post("/export/dxf", tags=["Export"])
def export_dxf(data: DXFExportRequest, current_user: User = Depends(get_current_user)):
    """Génère un fichier DXF AutoCAD depuis les paramètres du plan."""
    try:
        import ezdxf
        from ezdxf import colors
        import io

        doc = ezdxf.new("R2010")
        doc.header["$INSUNITS"] = 4  # mm
        doc.header["$MEASUREMENT"] = 1  # metric

        # Calques
        doc.layers.new("MURS_EXT", dxfattribs={"color": colors.WHITE, "lineweight": 50})
        doc.layers.new("MURS_INT", dxfattribs={"color": colors.CYAN, "lineweight": 25})
        doc.layers.new("COTES", dxfattribs={"color": colors.YELLOW, "lineweight": 13})
        doc.layers.new("TEXTES", dxfattribs={"color": colors.WHITE, "lineweight": 13})
        doc.layers.new("CADRE", dxfattribs={"color": 8, "lineweight": 13})

        msp = doc.modelspace()
        W = data.width * 1000    # m → mm
        L = data.length * 1000
        ep = 200                  # épaisseur murs 20 cm

        # ── Murs extérieurs (double ligne)
        outer = [(0, 0), (W, 0), (W, L), (0, L)]
        inner = [(ep, ep), (W - ep, ep), (W - ep, L - ep), (ep, L - ep)]
        msp.add_lwpolyline(outer, close=True, dxfattribs={"layer": "MURS_EXT", "lineweight": 70})
        msp.add_lwpolyline(inner, close=True, dxfattribs={"layer": "MURS_EXT", "lineweight": 70})

        # ── Rooms personnalisés
        if data.rooms:
            for room in data.rooms:
                rx = room.get("x", 0) * 1000
                ry = room.get("y", 0) * 1000
                rw = room.get("w", 3) * 1000
                rh = room.get("h", 3) * 1000
                msp.add_lwpolyline(
                    [(rx + ep, ry + ep), (rx + rw - ep, ry + ep),
                     (rx + rw - ep, ry + rh - ep), (rx + ep, ry + rh - ep)],
                    close=True, dxfattribs={"layer": "MURS_INT"}
                )
                # Label pièce
                cx, cy = rx + rw / 2, ry + rh / 2
                msp.add_text(
                    room.get("name", "Pièce"),
                    dxfattribs={"layer": "TEXTES", "height": 180, "insert": (cx, cy),
                                "halign": 1, "valign": 2}
                )
        else:
            # Plan générique selon surface
            _generate_generic_rooms(msp, W, L, ep, data.floors)

        # ── Cotation largeur
        dim = msp.add_linear_dim(
            base=(W / 2, -600), p1=(0, 0), p2=(W, 0),
            dxfattribs={"layer": "COTES", "dimscale": 50}
        )
        dim.render()

        # ── Cotation longueur
        dim2 = msp.add_linear_dim(
            base=(-600, L / 2), p1=(0, 0), p2=(0, L), angle=90,
            dxfattribs={"layer": "COTES", "dimscale": 50}
        )
        dim2.render()

        # ── Cartouche
        cw, ch = 3000, 1000
        cx0, cy0 = -200, -1400
        msp.add_lwpolyline(
            [(cx0, cy0), (cx0 + cw, cy0), (cx0 + cw, cy0 + ch), (cx0, cy0 + ch)],
            close=True, dxfattribs={"layer": "CADRE"}
        )
        msp.add_text("PHG BUILD IA", dxfattribs={"layer": "TEXTES", "height": 200,
            "insert": (cx0 + 150, cy0 + 700), "color": colors.YELLOW})
        msp.add_text(f"PROJET : {data.project_name}", dxfattribs={"layer": "TEXTES", "height": 130,
            "insert": (cx0 + 150, cy0 + 480)})
        msp.add_text(f"SURFACE : {data.width * data.length:.0f} m²  —  R+{data.floors - 1}",
            dxfattribs={"layer": "TEXTES", "height": 130, "insert": (cx0 + 150, cy0 + 320)})
        msp.add_text(f"Échelle 1:100  —  Unités : mm",
            dxfattribs={"layer": "TEXTES", "height": 100, "insert": (cx0 + 150, cy0 + 160)})

        # ── Écriture en mémoire
        stream = io.BytesIO()
        doc.write(stream)
        stream.seek(0)

        from fastapi.responses import Response as FastResponse
        return FastResponse(
            content=stream.read(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="plan_{data.project_name.replace(" ","_")}.dxf"'},
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="ezdxf non installé. Lancez : pip install ezdxf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_generic_rooms(msp, W: float, L: float, ep: float, floors: int):
    """Génère un plan générique avec salon, chambres, cuisine, SDB."""
    import ezdxf
    rooms_def = []
    if W <= 6000:
        # Studio
        rooms_def = [
            {"name": "Studio", "x": ep, "y": ep, "w": W - 2 * ep, "h": L - 2 * ep},
        ]
    else:
        half_w = (W - 2 * ep) / 2
        third_l = (L - 2 * ep) / 3
        rooms_def = [
            {"name": "Salon", "x": ep, "y": ep + third_l * 2, "w": W - 2 * ep, "h": third_l},
            {"name": "Cuisine", "x": ep, "y": ep + third_l, "w": half_w - ep / 2, "h": third_l},
            {"name": "SDB", "x": ep + half_w + ep / 2, "y": ep + third_l, "w": half_w - ep / 2, "h": third_l},
            {"name": "Chambre 1", "x": ep, "y": ep, "w": half_w - ep / 2, "h": third_l},
            {"name": "Chambre 2", "x": ep + half_w + ep / 2, "y": ep, "w": half_w - ep / 2, "h": third_l},
        ]
    for r in rooms_def:
        msp.add_lwpolyline(
            [(r["x"], r["y"]), (r["x"] + r["w"], r["y"]),
             (r["x"] + r["w"], r["y"] + r["h"]), (r["x"], r["y"] + r["h"])],
            close=True, dxfattribs={"layer": "MURS_INT"}
        )
        msp.add_text(r["name"], dxfattribs={
            "layer": "TEXTES", "height": max(100, min(200, r["h"] / 8)),
            "insert": (r["x"] + r["w"] / 2, r["y"] + r["h"] / 2), "halign": 1, "valign": 2,
        })


# ─────────────────────────────────────────────
# MODULE 3 — FOURNISSEURS
# ─────────────────────────────────────────────

SUPPLIERS_SEED = [
    {"name": "SOCOCIM Industries", "country": "SN", "category": "ciment", "contact": "Direction commerciale",
     "phone": "+221 33 839 50 00", "email": "commercial@sococim.sn", "address": "Rufisque, Sénégal",
     "min_order_amount": 500, "delivery_days": 3, "rating": 4.5, "price_level": "standard", "is_verified": True},
    {"name": "CIM Ivoire", "country": "CI", "category": "ciment", "contact": "Service vente",
     "phone": "+225 27 21 24 20 00", "email": "vente@cim-ivoire.ci", "address": "Abidjan, Côte d'Ivoire",
     "min_order_amount": 600, "delivery_days": 2, "rating": 4.3, "price_level": "standard", "is_verified": True},
    {"name": "CIMAF Cameroun", "country": "CM", "category": "ciment", "contact": "Ventes directes",
     "phone": "+237 222 22 40 00", "email": "info@cimaf-cm.com", "address": "Douala, Cameroun",
     "min_order_amount": 400, "delivery_days": 4, "rating": 4.0, "price_level": "low", "is_verified": True},
    {"name": "Acier Maroc", "country": "MA", "category": "acier", "contact": "Direction export",
     "phone": "+212 522 44 00 00", "email": "export@aciermaroc.ma", "address": "Casablanca, Maroc",
     "min_order_amount": 2000, "delivery_days": 7, "rating": 4.6, "price_level": "standard", "is_verified": True},
    {"name": "SONASID", "country": "MA", "category": "acier", "contact": "Commercial",
     "phone": "+212 537 71 60 00", "email": "commercial@sonasid.ma", "address": "Rabat, Maroc",
     "min_order_amount": 1500, "delivery_days": 5, "rating": 4.4, "price_level": "standard", "is_verified": True},
    {"name": "Lafarge Côte d'Ivoire", "country": "CI", "category": "ciment", "contact": "Service client",
     "phone": "+225 27 22 40 35 00", "email": "service.client@lafarge.ci", "address": "Abidjan, CI",
     "min_order_amount": 700, "delivery_days": 2, "rating": 4.7, "price_level": "premium", "is_verified": True},
    {"name": "Alucobond France", "country": "FR", "category": "aluminium", "contact": "Devis",
     "phone": "+33 1 42 00 00 00", "email": "devis@alucobond.fr", "address": "Paris, France",
     "min_order_amount": 5000, "delivery_days": 10, "rating": 4.8, "price_level": "premium", "is_verified": True},
    {"name": "Carrelages Tropicaux", "country": "CI", "category": "carrelage", "contact": "Showroom Abidjan",
     "phone": "+225 07 00 11 22 33", "email": "info@carrelages-tropicaux.ci", "address": "Plateau, Abidjan",
     "min_order_amount": 300, "delivery_days": 5, "rating": 3.9, "price_level": "standard", "is_verified": False},
    {"name": "PVC Sénégal", "country": "SN", "category": "plomberie", "contact": "Magasin Dakar",
     "phone": "+221 77 000 00 00", "email": "dakar@pvc-senegal.sn", "address": "Parcelles Assainies, Dakar",
     "min_order_amount": 200, "delivery_days": 2, "rating": 4.1, "price_level": "low", "is_verified": False},
    {"name": "Électro-Africa", "country": "CM", "category": "électricité", "contact": "Bureau technique",
     "phone": "+237 677 00 00 00", "email": "info@electro-africa.cm", "address": "Yaoundé, Cameroun",
     "min_order_amount": 500, "delivery_days": 3, "rating": 4.2, "price_level": "standard", "is_verified": True},
    {"name": "Bois Tropicaux Export", "country": "GA", "category": "bois", "contact": "Direction export",
     "phone": "+241 01 00 00 00", "email": "export@bois-tropicaux.ga", "address": "Libreville, Gabon",
     "min_order_amount": 3000, "delivery_days": 15, "rating": 4.3, "price_level": "standard", "is_verified": True},
    {"name": "Tôles Burkina", "country": "BF", "category": "couverture", "contact": "Ventes",
     "phone": "+226 25 36 00 00", "email": "ventes@toles-burkina.bf", "address": "Ouagadougou, Burkina Faso",
     "min_order_amount": 400, "delivery_days": 4, "rating": 3.8, "price_level": "low", "is_verified": False},
    {"name": "Peintures Mauger", "country": "FR", "category": "peinture", "contact": "SAV",
     "phone": "+33 2 35 00 00 00", "email": "pro@mauger.fr", "address": "Rouen, France",
     "min_order_amount": 1000, "delivery_days": 7, "rating": 4.5, "price_level": "premium", "is_verified": True},
    {"name": "OTIS Ascenseurs Maroc", "country": "MA", "category": "ascenseur", "contact": "Ingénierie",
     "phone": "+212 522 00 00 00", "email": "maroc@otis.com", "address": "Casablanca, Maroc",
     "min_order_amount": 20000, "delivery_days": 30, "rating": 4.9, "price_level": "premium", "is_verified": True},
    {"name": "Sanitaires Dakar", "country": "SN", "category": "sanitaire", "contact": "Boutique",
     "phone": "+221 33 000 00 00", "email": "boutique@sanitaires-dk.sn", "address": "Médina, Dakar",
     "min_order_amount": 150, "delivery_days": 1, "rating": 3.7, "price_level": "low", "is_verified": False},
]


@app.get("/suppliers", response_model=List[SupplierOut], tags=["Fournisseurs"])
def get_suppliers(country: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Supplier)
    if country:
        q = q.filter(Supplier.country == country)
    if category:
        q = q.filter(Supplier.category == category)
    return q.all()


@app.post("/orders", response_model=OrderOut, tags=["Fournisseurs"])
def create_order(payload: OrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = SupplierOrder(
        user_id=current_user.id,
        supplier_id=payload.supplier_id,
        supplier_name=payload.supplier_name,
        items=payload.items,
        total_amount=payload.total_amount,
        currency=payload.currency,
        notes=payload.notes,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[OrderOut], tags=["Fournisseurs"])
def get_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SupplierOrder).filter(SupplierOrder.user_id == current_user.id).order_by(SupplierOrder.created_at.desc()).all()


@app.patch("/orders/{order_id}/status", response_model=OrderOut, tags=["Fournisseurs"])
def update_order_status(order_id: int, status: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(SupplierOrder).filter(SupplierOrder.id == order_id, SupplierOrder.user_id == current_user.id).first()
    if not order:
        raise HTTPException(404, "Commande introuvable")
    order.status = status
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


# ─────────────────────────────────────────────
# MODULE 4 — GESTION DE CHANTIER
# ─────────────────────────────────────────────

@app.get("/chantier", response_model=List[ChantierOut], tags=["Chantier"])
def list_chantiers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Chantier).filter(Chantier.user_id == current_user.id).all()


@app.post("/chantier", response_model=ChantierOut, tags=["Chantier"])
def create_chantier(payload: ChantierCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = Chantier(user_id=current_user.id, **payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@app.get("/chantier/{cid}", response_model=ChantierOut, tags=["Chantier"])
def get_chantier(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Chantier).filter(Chantier.id == cid, Chantier.user_id == current_user.id).first()
    if not c:
        raise HTTPException(404, "Chantier introuvable")
    return c


@app.patch("/chantier/{cid}", response_model=ChantierOut, tags=["Chantier"])
def update_chantier(cid: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Chantier).filter(Chantier.id == cid, Chantier.user_id == current_user.id).first()
    if not c:
        raise HTTPException(404, "Chantier introuvable")
    for k, v in payload.items():
        if hasattr(c, k):
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@app.get("/chantier/{cid}/tasks", response_model=List[TaskOut], tags=["Chantier"])
def get_tasks(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChantierTask).filter(ChantierTask.chantier_id == cid).all()


@app.post("/chantier/{cid}/tasks", response_model=TaskOut, tags=["Chantier"])
def add_task(cid: int, payload: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = ChantierTask(chantier_id=cid, **payload.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@app.patch("/chantier/{cid}/tasks/{tid}", response_model=TaskOut, tags=["Chantier"])
def update_task(cid: int, tid: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(ChantierTask).filter(ChantierTask.id == tid, ChantierTask.chantier_id == cid).first()
    if not t:
        raise HTTPException(404, "Tâche introuvable")
    for k, v in payload.items():
        if hasattr(t, k):
            setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@app.get("/chantier/{cid}/workers", response_model=List[WorkerOut], tags=["Chantier"])
def get_workers(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChantierWorker).filter(ChantierWorker.chantier_id == cid).all()


@app.post("/chantier/{cid}/workers", response_model=WorkerOut, tags=["Chantier"])
def add_worker(cid: int, payload: WorkerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = ChantierWorker(chantier_id=cid, **payload.dict())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@app.post("/chantier/{cid}/workers/{wid}/attendance", response_model=WorkerOut, tags=["Chantier"])
def mark_attendance(cid: int, wid: int, payload: WorkerAttendance,
                    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = db.query(ChantierWorker).filter(ChantierWorker.id == wid, ChantierWorker.chantier_id == cid).first()
    if not w:
        raise HTTPException(404, "Ouvrier introuvable")
    if payload.present:
        w.present_days += 1
        if payload.amount:
            w.total_paid += payload.amount
        elif w.daily_rate:
            w.total_paid += w.daily_rate
    else:
        w.absent_days += 1
    db.commit()
    db.refresh(w)
    return w


# Seed fournisseurs au démarrage
def seed_suppliers(db: Session):
    if db.query(Supplier).count() == 0:
        for s in SUPPLIERS_SEED:
            db.add(Supplier(**s))
        db.commit()


# ─────────────────────────────────────────────
# ASSISTANT PHG IA — Claude API
# ─────────────────────────────────────────────

PHG_IA_SYSTEM = """Tu es **PHG IA**, ingénieur senior polyvalent avec 20 ans d'expérience, intégré à la plateforme PHG BUILD IA. Tu combines les compétences d'un ingénieur génie civil, d'un architecte, d'un thermicien et d'un chef de projet BTP. Tu réponds avec le niveau de précision et la rigueur d'un expert senior qui a conduit des centaines de projets, de la maison individuelle au bâtiment R+10, en France et en Afrique.

---

## 1. GÉNIE CIVIL & CALCULS STRUCTURELS
- **Béton armé** : dimensionnement poutres, poteaux, dalles, voiles, fondations superficielles et profondes (semelles isolées/filantes, radiers, pieux, micropieux) selon EC2, EC3, EC7, EC8 et BAEL 91 révisé 99
- **Charpentes** : bois massif, lamellé-collé, métal (IPE, HEA, tubes carrés), sections, assemblages, contreventements
- **Cubatures & terrassement** : volumes remblai/déblai, profils en long, compactage, portance CBR
- **Ponts & ouvrages d'art** : dalots, buses, ponts dalles, charges BK/BC/brL
- **Géotechnique** : rapports de sol G1→G5, capacité portante, tassements, soutènements
- **Dynamique** : analyse sismique EC8, spectre de réponse, zones France et Antilles

## 2. THERMIQUE, ÉNERGIE & ENVIRONNEMENT
- **RT 2012** : Bbio, Cep, Tic — seuils, garde-fous, points de vigilance
- **RE 2020** : Bbio, Cep, Cep,nr, DH (degrés-heures d'inconfort), Ic construction — différences vs RT 2012, jalons 2025/2028
- **DPE** : méthode 3CL, étiquettes A→G, seuils passoire thermique (F/G), rénovation énergétique
- **Isolation** : valeurs R et λ (laine de verre, laine de roche, PSE, XPS, ITI/ITE, ouate, paille), ponts thermiques, ψ linéiques
- **CVC** : PAC air/eau et géothermique (COP/SCOP), VMC double flux, plancher chauffant, rafraîchissement passif
- **ENR** : dimensionnement PV (puissance, production kWh/kWc/an), solaire thermique

## 3. CERTIFICATIONS & LABELS
- **HQE** : 14 cibles, niveaux Bon/Très Bon/Excellent/Exceptionnel
- **BREEAM** : catégories pondérées, niveaux Pass/Good/Very Good/Excellent/Outstanding
- **LEED v4/v4.1** : points par catégorie SS/WE/EA/MR/IEQ, niveaux Certified/Silver/Gold/Platinum
- **Passivhaus / BBC / BEPOS** : Uw<0,15 W/m²K, n50<0,6 h⁻¹, étanchéité à l'air
- **NF Habitat HQE, WELL Building Standard**

## 4. BIM & OUTILS NUMÉRIQUES
- **Revit** : familles MEP/structure/architecture, LOD 100→500, IFC export, Dynamo
- **ArchiCAD** : teamwork BIMcloud, IFC natif, GDL objects, BIMx
- **Calcul FEM** : Robot Structural Analysis, ETABS, SAP2000, SCIA Engineer
- **STD** : Pleiades+Comfie, EnergyPlus — lecture et interprétation de résultats
- **Topographie** : NGF-IGN69, Lambert 93, drone photogrammétrique (3–5 cm), scanner laser 3D, MNT
- **Estimatif** : BIM to quantity takeoff, BATIPRIX, DPGF, BPU/DQE, ratios m²/m³

## 5. MATÉRIAUX INNOVANTS & DURABLES
- **Biosourcés** : CLT, ossature bois, chanvre-chaux, paille (R≈7 pour 36cm), terre crue (BTC/pisé/adobe), bambou structural
- **Bétons spéciaux** : BTHP/UHPFRC, fibré, léger, autoplaçant, recyclé (granulats issus de déconstruction)
- **Façades** : VEA, murs rideaux, double-peau bioclimatique, toitures végétalisées (extensif/intensif)
- **Géosynthétiques** : géogrilles, géotextiles, géomembranes PEHD
- **Nano-matériaux** : béton autonettoyant (TiO₂), aerogel (λ≈0,015 W/mK), ciments bas carbone (géopolymères)

## 6. GESTION DE CHANTIER & MANAGEMENT
- **Planification** : PERT, CPM, Gantt, ressources nivelées, rendements par corps d'état
- **Contrôle coûts** : CCTP/DPGF/BPU/DQE, révision de prix (index BT01→BT50), retenue de garantie 5%, DGD
- **Qualité** : PAQ, VISA études, conformité matériaux (CE, ACERMI, CSTB ATec/ATEx), réceptions, GPA
- **Sécurité** : PPSPS, coordination SPS (PGCSPS), risques chantier (hauteur, tranchées, co-activité)
- **Réglementation française** : PC, déclaration préalable, DAACT, garanties décennale/biennale/parfait achèvement, DO
- **Marchés publics** : MAPA, appel d'offres, CCAG Travaux, sous-traitance loi 1975, avenant 5%

## 7. CONTEXTE AFRIQUE & DIASPORA
- **Matériaux locaux** : ciment CPJ 35/42.5 (Lafarge, Cimaf, Diamond Cement, Dangote), fer HA, agglos, BTC, tôles bac acier
- **Conditions tropicales** : humidité, cyclones (AZ1/AZ2/AZ3), termites (NF EN ISO 21887), ensoleillement intense
- **Prix locaux 2025** : sac ciment 50kg ≈ 6 000–8 500 FCFA, fer HA12 ≈ 12 000 FCFA/barre 12m, agglo 15 ≈ 550–700 FCFA/u, maçon ≈ 6 000–10 000 FCFA/j
- **Fournisseurs** : Lafarge CI, Cimaf (SN/CI/CM), Vicat (BF/ML), Heidelberg, Soares Correia (CM), CIMENCAM
- **Réglementations locales** : DTR CI, code construction SN, normes COBEMA CM, parasismique Antilles françaises

## 8. TOPOGRAPHIE, CUBATURES & NIVELLEMENT
- **Nivellement** : NGF-IGN69, nivellement direct/indirect, erreur de fermeture admissible (K√L mm), carnet de nivellement
- **Cubatures** : méthode des prismes, Simpson, LiDAR, courbes de niveau → volumes, calcul remblai/déblai, distance de transport
- **Implantation** : RGF93/Lambert 93, piquetage, contrôle géomètre-expert
- **Relevés** : drone photogrammétrique (3–5 cm), scanner laser 3D, orthophoto, MNT

---

## PROFIL & POSTURE
Tu es un **expert senior avec 20 ans d'expérience** ayant exercé en BET structure, MOE, entreprise générale et AMO. Tu as conduit des villas individuelles, immeubles R+8, infrastructures routières, équipements publics (écoles, hôpitaux), projets certifiés HQE/BREEAM, en France, Côte d'Ivoire, Sénégal, Cameroun et Maroc.

**Comportement :**
- Tu parles avec **l'autorité et la précision d'un expert**, pas d'un générateur de texte générique
- Pour les calculs : formule → valeurs → résultat → vérification
- Pour les devis : fourchettes réalistes avec hypothèses explicitées
- Tu **cites systématiquement** la norme, DTU, Eurocode ou CSTB ATec applicable
- Tu signales les **points de vigilance** (risques, pièges courants, erreurs fréquentes)
- Tu proposes des **alternatives** avec pros/cons quand pertinent
- Si une question nécessite une étude de sol ou un BET, tu le dis explicitement
- Tu adaptes le niveau de détail : question rapide → réponse synthétique ; calcul complexe → développement complet
- Tu réponds **dans la langue de l'utilisateur** (français par défaut)

## FORMAT
- Titres ## et ### pour structurer les réponses longues
- Tableaux pour comparatifs, quantités, prix, caractéristiques matériaux
- Blocs de calcul avec notation claire : N_Ed ≤ N_Rd, M = q·L²/8
- Blockquotes > pour règles à retenir, points critiques, rappels normatifs
- Estimations toujours avec unité + monnaie (FCFA, EUR) et fourchette min–max"""


class AIChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]
    lang: str = "fr"

class AIChatResponse(BaseModel):
    reply: str
    input_tokens: int
    output_tokens: int
    model: str


@app.post("/ai/chat", response_model=AIChatResponse, tags=["IA"])
async def ai_chat(payload: AIChatRequest):
    """Assistant PHG IA — propulsé par Claude (Anthropic)."""
    if not _ANTHROPIC_AVAILABLE:
        raise HTTPException(503, "Package 'anthropic' non installé sur le serveur. Exécutez : pip install anthropic")

    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "Clé API Anthropic non configurée. Définissez la variable d'environnement ANTHROPIC_API_KEY.")

    if not payload.messages:
        raise HTTPException(400, "La liste de messages est vide.")

    # Validation des rôles
    for msg in payload.messages:
        if msg.role not in ("user", "assistant"):
            raise HTTPException(400, f"Rôle invalide : '{msg.role}'. Utilisez 'user' ou 'assistant'.")

    client = anthropic_sdk.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=PHG_IA_SYSTEM,
            messages=[{"role": m.role, "content": m.content} for m in payload.messages],
        )
    except anthropic_sdk.AuthenticationError:
        raise HTTPException(401, "Clé API Anthropic invalide.")
    except anthropic_sdk.RateLimitError:
        raise HTTPException(429, "Limite de requêtes Anthropic atteinte. Réessayez dans un instant.")
    except Exception as e:
        raise HTTPException(500, f"Erreur API Anthropic : {str(e)}")

    return AIChatResponse(
        reply=response.content[0].text,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        model=response.model,
    )


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("phg_build_ia_backend:app", host="0.0.0.0", port=8000, reload=True)
