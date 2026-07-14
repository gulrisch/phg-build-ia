# ═══════════════════════════════════════════════════════════════
# PHG BUILD IA — Backend FastAPI (FICHIER COMPLET AVEC /devis/analyser + /devis/rapport-pdf)
# ═══════════════════════════════════════════════════════════════
# INSTRUCTIONS : remplacer entièrement phg_build_ia_backend.py
# par ce fichier dans le repo GitHub gulrisch/phg-build-ia/backend/
# ═══════════════════════════════════════════════════════════════

"""
PHG BUILD IA — Backend FastAPI
Plateforme de construction intelligente pour la diaspora africaine francophone
"""

import os
import json
import base64
import hmac
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List

print("=== STRIPE DEBUG ===")
print(f"STRIPE_SECRET_KEY present: {'STRIPE_SECRET_KEY' in os.environ}")
print(f"All env vars with STRIPE: {[k for k in os.environ.keys() if 'STRIPE' in k]}")
print("===================")

try:
    import anthropic as anthropic_sdk
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

import stripe
from fastapi import FastAPI, Depends, HTTPException, Header, Request, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, ExpiredSignatureError, jwt
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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 30)))

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./phg_build_ia.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://phg-build-ia.vercel.app")

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
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10
    _engine_kwargs["pool_timeout"] = 30
    _engine_kwargs["pool_recycle"] = 1800

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
    country = Column(String, nullable=True)
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
    country = Column(String, nullable=False)
    city = Column(String, nullable=True)
    project_type = Column(String, nullable=False)
    surface_m2 = Column(Float, nullable=False)
    floors = Column(Integer, default=1)
    quality_level = Column(String, default="standard")
    estimated_cost_local = Column(Float, nullable=True)
    estimated_cost_eur = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    materials_detail = Column(JSON, nullable=True)
    status = Column(String, default="draft")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    owner = relationship("User", back_populates="projects")


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    plan = Column(String, nullable=False)
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
    country_code = Column(String, unique=True, nullable=False)
    country_name = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    eur_rate = Column(Float, nullable=False)
    cost_economique_m2 = Column(Float, nullable=False)
    cost_standard_m2 = Column(Float, nullable=False)
    cost_premium_m2 = Column(Float, nullable=False)
    materials = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    category = Column(String, nullable=False)
    contact = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    min_order_amount = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    rating = Column(Float, default=4.0)
    price_level = Column(String, default="standard")
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    orders = relationship("SupplierOrder", back_populates="supplier", cascade="all, delete-orphan")


class SupplierOrder(Base):
    __tablename__ = "supplier_orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String, nullable=False)
    items = Column(JSON, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    status = Column(String, default="pending")
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
    status = Column(String, default="planifie")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tasks = relationship("ChantierTask", back_populates="chantier", cascade="all, delete-orphan")
    workers = relationship("ChantierWorker", back_populates="chantier", cascade="all, delete-orphan")


class ChantierTask(Base):
    __tablename__ = "chantier_tasks"
    id = Column(Integer, primary_key=True, index=True)
    chantier_id = Column(Integer, ForeignKey("chantiers.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    week = Column(Integer, nullable=True)
    status = Column(String, default="planifie")
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
    role = Column(String, nullable=True)
    daily_rate = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    present_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    total_paid = Column(Float, default=0)
    chantier = relationship("Chantier", back_populates="workers")


class Plan(Base):
    __tablename__ = "plans"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    walls = Column(JSON, nullable=False, default=list)
    items = Column(JSON, nullable=False, default=list)
    labels = Column(JSON, nullable=False, default=list)
    sketches = Column(JSON, nullable=False, default=list)
    meta = Column(JSON, nullable=False, default=dict)
    thumbnail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────
# SEED DATA (abrégé — identique à l'original)
# ─────────────────────────────────────────────
AFRICAN_COUNTRIES_SEED = [
    {"country_code":"SN","country_name":"Sénégal","currency":"XOF","eur_rate":655.957,"cost_economique_m2":180000,"cost_standard_m2":280000,"cost_premium_m2":500000,"materials":{"ciment_sac_50kg":7500,"fer_beton_kg":650,"sable_m3":15000,"gravier_m3":20000,"brique_unite":350,"carrelage_m2":8000,"toiture_m2":12000,"peinture_litre":4500,"main_oeuvre_journalier":5000}},
    {"country_code":"CI","country_name":"Côte d'Ivoire","currency":"XOF","eur_rate":655.957,"cost_economique_m2":200000,"cost_standard_m2":320000,"cost_premium_m2":580000,"materials":{"ciment_sac_50kg":8000,"fer_beton_kg":700,"sable_m3":18000,"gravier_m3":22000,"brique_unite":400,"carrelage_m2":9500,"toiture_m2":14000,"peinture_litre":5000,"main_oeuvre_journalier":6000}},
    {"country_code":"CM","country_name":"Cameroun","currency":"XAF","eur_rate":655.957,"cost_economique_m2":175000,"cost_standard_m2":270000,"cost_premium_m2":490000,"materials":{"ciment_sac_50kg":7000,"fer_beton_kg":620,"sable_m3":14000,"gravier_m3":19000,"brique_unite":320,"carrelage_m2":8500,"toiture_m2":11000,"peinture_litre":4200,"main_oeuvre_journalier":4500}},
    {"country_code":"ML","country_name":"Mali","currency":"XOF","eur_rate":655.957,"cost_economique_m2":150000,"cost_standard_m2":230000,"cost_premium_m2":420000,"materials":{"ciment_sac_50kg":6500,"fer_beton_kg":580,"sable_m3":12000,"gravier_m3":16000,"brique_unite":280,"carrelage_m2":7000,"toiture_m2":9500,"peinture_litre":3800,"main_oeuvre_journalier":3500}},
    {"country_code":"BF","country_name":"Burkina Faso","currency":"XOF","eur_rate":655.957,"cost_economique_m2":145000,"cost_standard_m2":220000,"cost_premium_m2":400000,"materials":{"ciment_sac_50kg":6200,"fer_beton_kg":560,"sable_m3":11000,"gravier_m3":15000,"brique_unite":260,"carrelage_m2":6500,"toiture_m2":9000,"peinture_litre":3600,"main_oeuvre_journalier":3200}},
    {"country_code":"GN","country_name":"Guinée","currency":"GNF","eur_rate":8600.0,"cost_economique_m2":1500000,"cost_standard_m2":2400000,"cost_premium_m2":4200000,"materials":{"ciment_sac_50kg":55000,"fer_beton_kg":5200,"sable_m3":95000,"gravier_m3":130000,"brique_unite":2200,"carrelage_m2":65000,"toiture_m2":90000,"peinture_litre":32000,"main_oeuvre_journalier":28000}},
    {"country_code":"TG","country_name":"Togo","currency":"XOF","eur_rate":655.957,"cost_economique_m2":155000,"cost_standard_m2":245000,"cost_premium_m2":440000,"materials":{"ciment_sac_50kg":6800,"fer_beton_kg":600,"sable_m3":13000,"gravier_m3":17000,"brique_unite":300,"carrelage_m2":7500,"toiture_m2":10500,"peinture_litre":4000,"main_oeuvre_journalier":4000}},
    {"country_code":"BJ","country_name":"Bénin","currency":"XOF","eur_rate":655.957,"cost_economique_m2":160000,"cost_standard_m2":250000,"cost_premium_m2":450000,"materials":{"ciment_sac_50kg":7000,"fer_beton_kg":610,"sable_m3":13500,"gravier_m3":18000,"brique_unite":310,"carrelage_m2":7800,"toiture_m2":11000,"peinture_litre":4100,"main_oeuvre_journalier":4200}},
    {"country_code":"CD","country_name":"RD Congo","currency":"CDF","eur_rate":2800.0,"cost_economique_m2":420000,"cost_standard_m2":680000,"cost_premium_m2":1200000,"materials":{"ciment_sac_50kg":18000,"fer_beton_kg":1700,"sable_m3":32000,"gravier_m3":45000,"brique_unite":850,"carrelage_m2":22000,"toiture_m2":30000,"peinture_litre":11000,"main_oeuvre_journalier":9000}},
    {"country_code":"MA","country_name":"Maroc","currency":"MAD","eur_rate":10.85,"cost_economique_m2":4500,"cost_standard_m2":7000,"cost_premium_m2":12000,"materials":{"ciment_sac_50kg":75,"fer_beton_kg":8,"sable_m3":150,"gravier_m3":200,"brique_unite":3,"carrelage_m2":90,"toiture_m2":130,"peinture_litre":45,"main_oeuvre_journalier":180}},
    {"country_code":"TN","country_name":"Tunisie","currency":"TND","eur_rate":3.35,"cost_economique_m2":1400,"cost_standard_m2":2200,"cost_premium_m2":3800,"materials":{"ciment_sac_50kg":24,"fer_beton_kg":2.8,"sable_m3":55,"gravier_m3":70,"brique_unite":0.9,"carrelage_m2":28,"toiture_m2":45,"peinture_litre":14,"main_oeuvre_journalier":60}},
    {"country_code":"NG","country_name":"Nigeria","currency":"NGN","eur_rate":1620.0,"cost_economique_m2":250000,"cost_standard_m2":420000,"cost_premium_m2":750000,"materials":{"ciment_sac_50kg":9500,"fer_beton_kg":900,"sable_m3":25000,"gravier_m3":35000,"brique_unite":600,"carrelage_m2":12000,"toiture_m2":18000,"peinture_litre":7000,"main_oeuvre_journalier":8000}},
    {"country_code":"GH","country_name":"Ghana","currency":"GHS","eur_rate":15.8,"cost_economique_m2":1800,"cost_standard_m2":2900,"cost_premium_m2":5200,"materials":{"ciment_sac_50kg":68,"fer_beton_kg":7.5,"sable_m3":180,"gravier_m3":240,"brique_unite":4.5,"carrelage_m2":85,"toiture_m2":120,"peinture_litre":42,"main_oeuvre_journalier":55}},
    {"country_code":"MG","country_name":"Madagascar","currency":"MGA","eur_rate":4700.0,"cost_economique_m2":700000,"cost_standard_m2":1100000,"cost_premium_m2":2000000,"materials":{"ciment_sac_50kg":28000,"fer_beton_kg":2800,"sable_m3":60000,"gravier_m3":85000,"brique_unite":1800,"carrelage_m2":35000,"toiture_m2":50000,"peinture_litre":18000,"main_oeuvre_journalier":15000}},
    {"country_code":"FR","country_name":"France","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1500,"cost_standard_m2":2200,"cost_premium_m2":3800,"materials":{"ciment_sac_50kg":12,"fer_beton_kg":1.1,"sable_m3":35,"gravier_m3":45,"brique_unite":1.2,"carrelage_m2":35,"toiture_m2":80,"peinture_litre":18,"main_oeuvre_journalier":280}},
    {"country_code":"CH","country_name":"Suisse","currency":"CHF","eur_rate":0.97,"cost_economique_m2":3800,"cost_standard_m2":5500,"cost_premium_m2":9000,"materials":{"ciment_sac_50kg":22,"fer_beton_kg":2.0,"sable_m3":65,"gravier_m3":85,"brique_unite":2.2,"carrelage_m2":65,"toiture_m2":150,"peinture_litre":32,"main_oeuvre_journalier":520}},
    {"country_code":"BE","country_name":"Belgique","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1400,"cost_standard_m2":2000,"cost_premium_m2":3500,"materials":{"ciment_sac_50kg":11,"fer_beton_kg":1.0,"sable_m3":32,"gravier_m3":42,"brique_unite":0.95,"carrelage_m2":30,"toiture_m2":75,"peinture_litre":16,"main_oeuvre_journalier":260}},
    {"country_code":"PT","country_name":"Portugal","currency":"EUR","eur_rate":1.0,"cost_economique_m2":900,"cost_standard_m2":1400,"cost_premium_m2":2400,"materials":{"ciment_sac_50kg":8,"fer_beton_kg":0.85,"sable_m3":22,"gravier_m3":28,"brique_unite":0.65,"carrelage_m2":22,"toiture_m2":55,"peinture_litre":12,"main_oeuvre_journalier":160}},
    {"country_code":"ES","country_name":"Espagne","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1000,"cost_standard_m2":1600,"cost_premium_m2":2800,"materials":{"ciment_sac_50kg":9,"fer_beton_kg":0.90,"sable_m3":25,"gravier_m3":32,"brique_unite":0.70,"carrelage_m2":25,"toiture_m2":60,"peinture_litre":13,"main_oeuvre_journalier":175}},
    {"country_code":"DE","country_name":"Allemagne","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1800,"cost_standard_m2":2600,"cost_premium_m2":4200,"materials":{"ciment_sac_50kg":14,"fer_beton_kg":1.2,"sable_m3":38,"gravier_m3":50,"brique_unite":1.1,"carrelage_m2":38,"toiture_m2":90,"peinture_litre":20,"main_oeuvre_journalier":320}},
    {"country_code":"GB","country_name":"Royaume-Uni","currency":"GBP","eur_rate":0.86,"cost_economique_m2":1800,"cost_standard_m2":2800,"cost_premium_m2":5000,"materials":{"ciment_sac_50kg":14,"fer_beton_kg":1.3,"sable_m3":42,"gravier_m3":55,"brique_unite":1.0,"carrelage_m2":40,"toiture_m2":95,"peinture_litre":22,"main_oeuvre_journalier":350}},
    {"country_code":"IT","country_name":"Italie","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1100,"cost_standard_m2":1700,"cost_premium_m2":3000,"materials":{"ciment_sac_50kg":10,"fer_beton_kg":0.95,"sable_m3":28,"gravier_m3":36,"brique_unite":0.80,"carrelage_m2":28,"toiture_m2":65,"peinture_litre":14,"main_oeuvre_journalier":200}},
    {"country_code":"CA","country_name":"Canada","currency":"CAD","eur_rate":1.52,"cost_economique_m2":2200,"cost_standard_m2":3400,"cost_premium_m2":6000,"materials":{"ciment_sac_50kg":22,"fer_beton_kg":2.0,"sable_m3":55,"gravier_m3":70,"brique_unite":1.8,"carrelage_m2":50,"toiture_m2":110,"peinture_litre":28,"main_oeuvre_journalier":400}},
    {"country_code":"US","country_name":"États-Unis","currency":"USD","eur_rate":1.09,"cost_economique_m2":1600,"cost_standard_m2":2500,"cost_premium_m2":5000,"materials":{"ciment_sac_50kg":16,"fer_beton_kg":1.5,"sable_m3":45,"gravier_m3":60,"brique_unite":1.5,"carrelage_m2":45,"toiture_m2":100,"peinture_litre":25,"main_oeuvre_journalier":380}},
    {"country_code":"BR","country_name":"Brésil","currency":"BRL","eur_rate":5.50,"cost_economique_m2":2800,"cost_standard_m2":4500,"cost_premium_m2":8500,"materials":{"ciment_sac_50kg":45,"fer_beton_kg":4.5,"sable_m3":120,"gravier_m3":160,"brique_unite":0.90,"carrelage_m2":80,"toiture_m2":180,"peinture_litre":55,"main_oeuvre_journalier":180}},
    {"country_code":"HT","country_name":"Haïti","currency":"HTG","eur_rate":148.0,"cost_economique_m2":55000,"cost_standard_m2":90000,"cost_premium_m2":160000,"materials":{"ciment_sac_50kg":2200,"fer_beton_kg":210,"sable_m3":5500,"gravier_m3":7500,"brique_unite":45,"carrelage_m2":3800,"toiture_m2":8000,"peinture_litre":2600,"main_oeuvre_journalier":1200}},
    {"country_code":"MQ","country_name":"Martinique","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1800,"cost_standard_m2":2700,"cost_premium_m2":4500,"materials":{"ciment_sac_50kg":18,"fer_beton_kg":1.6,"sable_m3":50,"gravier_m3":65,"brique_unite":1.5,"carrelage_m2":45,"toiture_m2":100,"peinture_litre":25,"main_oeuvre_journalier":300}},
    {"country_code":"GP","country_name":"Guadeloupe","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1750,"cost_standard_m2":2600,"cost_premium_m2":4400,"materials":{"ciment_sac_50kg":17,"fer_beton_kg":1.55,"sable_m3":48,"gravier_m3":62,"brique_unite":1.4,"carrelage_m2":43,"toiture_m2":95,"peinture_litre":24,"main_oeuvre_journalier":295}},
    {"country_code":"MX","country_name":"Mexique","currency":"MXN","eur_rate":19.5,"cost_economique_m2":10000,"cost_standard_m2":16000,"cost_premium_m2":30000,"materials":{"ciment_sac_50kg":180,"fer_beton_kg":18,"sable_m3":480,"gravier_m3":640,"brique_unite":5.5,"carrelage_m2":320,"toiture_m2":700,"peinture_litre":220,"main_oeuvre_journalier":700}},
    {"country_code":"VN","country_name":"Vietnam","currency":"VND","eur_rate":27000.0,"cost_economique_m2":8000000,"cost_standard_m2":13000000,"cost_premium_m2":25000000,"materials":{"ciment_sac_50kg":90000,"fer_beton_kg":18000,"sable_m3":280000,"gravier_m3":380000,"brique_unite":3500,"carrelage_m2":250000,"toiture_m2":450000,"peinture_litre":120000,"main_oeuvre_journalier":320000}},
    {"country_code":"IN","country_name":"Inde","currency":"INR","eur_rate":91.0,"cost_economique_m2":25000,"cost_standard_m2":40000,"cost_premium_m2":80000,"materials":{"ciment_sac_50kg":380,"fer_beton_kg":65,"sable_m3":1200,"gravier_m3":1600,"brique_unite":12,"carrelage_m2":900,"toiture_m2":2000,"peinture_litre":550,"main_oeuvre_journalier":900}},
    {"country_code":"AE","country_name":"Émirats Arabes Unis","currency":"AED","eur_rate":4.0,"cost_economique_m2":3500,"cost_standard_m2":6000,"cost_premium_m2":12000,"materials":{"ciment_sac_50kg":45,"fer_beton_kg":4.5,"sable_m3":110,"gravier_m3":150,"brique_unite":2.5,"carrelage_m2":120,"toiture_m2":280,"peinture_litre":75,"main_oeuvre_journalier":250}},
    {"country_code":"CN","country_name":"Chine","currency":"CNY","eur_rate":7.85,"cost_economique_m2":3500,"cost_standard_m2":6000,"cost_premium_m2":11000,"materials":{"ciment_sac_50kg":35,"fer_beton_kg":4.2,"sable_m3":100,"gravier_m3":135,"brique_unite":1.5,"carrelage_m2":85,"toiture_m2":200,"peinture_litre":55,"main_oeuvre_journalier":300}},
    {"country_code":"AU","country_name":"Australie","currency":"AUD","eur_rate":1.68,"cost_economique_m2":2800,"cost_standard_m2":4200,"cost_premium_m2":7500,"materials":{"ciment_sac_50kg":30,"fer_beton_kg":2.8,"sable_m3":75,"gravier_m3":100,"brique_unite":2.2,"carrelage_m2":60,"toiture_m2":130,"peinture_litre":38,"main_oeuvre_journalier":600}},
    {"country_code":"NZ","country_name":"Nouvelle-Zélande","currency":"NZD","eur_rate":1.85,"cost_economique_m2":3200,"cost_standard_m2":4800,"cost_premium_m2":8500,"materials":{"ciment_sac_50kg":32,"fer_beton_kg":3.0,"sable_m3":80,"gravier_m3":108,"brique_unite":2.4,"carrelage_m2":65,"toiture_m2":140,"peinture_litre":40,"main_oeuvre_journalier":620}},
    {"country_code":"GA","country_name":"Gabon","currency":"XAF","eur_rate":655.957,"cost_economique_m2":210000,"cost_standard_m2":340000,"cost_premium_m2":600000,"materials":{"ciment_sac_50kg":9000,"fer_beton_kg":750,"sable_m3":18000,"gravier_m3":24000,"brique_unite":420,"carrelage_m2":10000,"toiture_m2":15000,"peinture_litre":5500,"main_oeuvre_journalier":7000}},
    {"country_code":"CG","country_name":"République du Congo","currency":"XAF","eur_rate":655.957,"cost_economique_m2":195000,"cost_standard_m2":310000,"cost_premium_m2":560000,"materials":{"ciment_sac_50kg":8500,"fer_beton_kg":720,"sable_m3":17000,"gravier_m3":23000,"brique_unite":400,"carrelage_m2":9800,"toiture_m2":14500,"peinture_litre":5200,"main_oeuvre_journalier":6500}},
    {"country_code":"NE","country_name":"Niger","currency":"XOF","eur_rate":655.957,"cost_economique_m2":140000,"cost_standard_m2":210000,"cost_premium_m2":380000,"materials":{"ciment_sac_50kg":6000,"fer_beton_kg":540,"sable_m3":10500,"gravier_m3":14500,"brique_unite":250,"carrelage_m2":6200,"toiture_m2":8800,"peinture_litre":3400,"main_oeuvre_journalier":3000}},
    {"country_code":"RE","country_name":"La Réunion","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1700,"cost_standard_m2":2500,"cost_premium_m2":4200,"materials":{"ciment_sac_50kg":16,"fer_beton_kg":1.5,"sable_m3":48,"gravier_m3":62,"brique_unite":1.4,"carrelage_m2":42,"toiture_m2":95,"peinture_litre":23,"main_oeuvre_journalier":280}},
    {"country_code":"GF","country_name":"Guyane française","currency":"EUR","eur_rate":1.0,"cost_economique_m2":1600,"cost_standard_m2":2400,"cost_premium_m2":4000,"materials":{"ciment_sac_50kg":15,"fer_beton_kg":1.45,"sable_m3":45,"gravier_m3":58,"brique_unite":1.3,"carrelage_m2":40,"toiture_m2":90,"peinture_litre":22,"main_oeuvre_journalier":270}},
    {"country_code":"AR","country_name":"Argentine","currency":"ARS","eur_rate":1000.0,"cost_economique_m2":450000,"cost_standard_m2":720000,"cost_premium_m2":1400000,"materials":{"ciment_sac_50kg":8500,"fer_beton_kg":900,"sable_m3":22000,"gravier_m3":30000,"brique_unite":120,"carrelage_m2":15000,"toiture_m2":35000,"peinture_litre":10000,"main_oeuvre_journalier":18000}},
    {"country_code":"LB","country_name":"Liban","currency":"USD","eur_rate":1.09,"cost_economique_m2":600,"cost_standard_m2":1000,"cost_premium_m2":2000,"materials":{"ciment_sac_50kg":12,"fer_beton_kg":1.2,"sable_m3":35,"gravier_m3":48,"brique_unite":1.1,"carrelage_m2":28,"toiture_m2":70,"peinture_litre":18,"main_oeuvre_journalier":60}},
    {"country_code":"QA","country_name":"Qatar","currency":"QAR","eur_rate":3.97,"cost_economique_m2":2800,"cost_standard_m2":5000,"cost_premium_m2":10000,"materials":{"ciment_sac_50kg":38,"fer_beton_kg":4.0,"sable_m3":95,"gravier_m3":130,"brique_unite":2.2,"carrelage_m2":100,"toiture_m2":240,"peinture_litre":65,"main_oeuvre_journalier":200}},
    {"country_code":"SG","country_name":"Singapour","currency":"SGD","eur_rate":1.46,"cost_economique_m2":3500,"cost_standard_m2":5500,"cost_premium_m2":10000,"materials":{"ciment_sac_50kg":38,"fer_beton_kg":3.8,"sable_m3":95,"gravier_m3":130,"brique_unite":2.0,"carrelage_m2":95,"toiture_m2":220,"peinture_litre":62,"main_oeuvre_journalier":450}},
    {"country_code":"JP","country_name":"Japon","currency":"JPY","eur_rate":162.0,"cost_economique_m2":280000,"cost_standard_m2":430000,"cost_premium_m2":800000,"materials":{"ciment_sac_50kg":2800,"fer_beton_kg":320,"sable_m3":7500,"gravier_m3":10000,"brique_unite":180,"carrelage_m2":7500,"toiture_m2":18000,"peinture_litre":5000,"main_oeuvre_journalier":35000}},
]


def seed_countries(db: Session):
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
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée, reconnectez-vous")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token invalide")
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou inactif")
    return user

def require_subscription(current_user: User = Depends(get_current_user)) -> User:
    sub = current_user.subscription
    if not sub or not sub.is_active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Abonnement requis pour accéder à cette fonctionnalité")
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
    country: str
    city: Optional[str] = None
    project_type: str
    surface_m2: float
    floors: int = 1
    quality_level: str = "standard"

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
    plan: str

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

class DXFExportRequest(BaseModel):
    width: float = 10.0
    length: float = 12.0
    floors: int = 1
    project_name: str = "Plan PHG"
    rooms: Optional[List[dict]] = None

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
    items: List[dict]
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

# ── Schéma Analyse Devis ─────────────────────
class DevisAnalyseResponse(BaseModel):
    succes: bool
    resume: str
    prix_abusifs: list
    postes_manquants: list
    recommandations: list
    score_fiabilite: int
    rapport_complet: str


# ─────────────────────────────────────────────
# LOGIQUE ESTIMATION
# ─────────────────────────────────────────────
FLOOR_MULTIPLIER = {1: 1.0, 2: 1.85, 3: 2.65, 4: 3.40}
PROJECT_TYPE_FACTOR = {"villa": 1.0, "appartement": 0.90, "commerce": 1.10, "entrepot": 0.75, "bureau": 1.05}

def compute_estimation(country_data, surface_m2, floors, quality_level, project_type):
    cost_map = {"economique": country_data.cost_economique_m2, "standard": country_data.cost_standard_m2, "premium": country_data.cost_premium_m2}
    base_cost_m2 = cost_map.get(quality_level, country_data.cost_standard_m2)
    floor_mult = FLOOR_MULTIPLIER.get(min(floors, 4), 1.0 + (floors - 1) * 0.75)
    type_factor = PROJECT_TYPE_FACTOR.get(project_type, 1.0)
    total_surface = surface_m2 * floors
    total_local = base_cost_m2 * total_surface * type_factor * floor_mult
    total_eur = total_local / country_data.eur_rate
    materials_detail = {}
    if country_data.materials:
        for mat, price in country_data.materials.items():
            materials_detail[mat] = {"prix_unitaire": price, "devise": country_data.currency}
    return {"cost_per_m2_local": base_cost_m2, "total_cost_local": round(total_local, 2), "total_cost_eur": round(total_eur, 2), "currency": country_data.currency, "materials_reference": materials_detail}


# ─────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_countries(db)
        seed_suppliers(db)
    finally:
        db.close()
    yield
    engine.dispose()

app = FastAPI(title="PHG BUILD IA API", description="Plateforme de construction intelligente pour la diaspora africaine francophone", version="2.0.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://frontend-goulia-s-projects.vercel.app",
    "https://phg-build-ia.vercel.app",
    "https://phg-build-i3q0u8wjy-goulia-s-projects.vercel.app",
    "https://build.gulrisch.com",
    FRONTEND_URL,
    *([o for o in os.getenv("EXTRA_CORS_ORIGINS", "").split(",") if o]),
]

app.add_middleware(CORSMiddleware, allow_origins=_ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

from fastapi.responses import JSONResponse
from starlette.requests import Request as StarletteRequest

@app.exception_handler(Exception)
async def global_exception_handler(request: StarletteRequest, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)


# ─────────────────────────────────────────────
# ROUTES AUTH
# ─────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse, tags=["Auth"])
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(email=payload.email, full_name=payload.full_name, hashed_password=hash_password(payload.password), country=payload.country)
    db.add(user)
    db.flush()
    sub = Subscription(user_id=user.id, plan="FREE", is_active=False)
    db.add(sub)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user_id=user.id, full_name=user.full_name, plan="FREE")

@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    plan = user.subscription.plan if user.subscription else "FREE"
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user_id=user.id, full_name=user.full_name, plan=plan)

@app.get("/auth/me", response_model=UserOut, tags=["Auth"])
def me(current_user: User = Depends(get_current_user)):
    plan = current_user.subscription.plan if current_user.subscription else None
    return UserOut(id=current_user.id, email=current_user.email, full_name=current_user.full_name, country=current_user.country, is_active=current_user.is_active, plan=plan, created_at=current_user.created_at)


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
def create_project(payload: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    country_data = db.query(CountryData).filter(CountryData.country_code == payload.country.upper()).first()
    if not country_data:
        raise HTTPException(status_code=404, detail=f"Pays '{payload.country}' non supporté")
    est = compute_estimation(country_data, payload.surface_m2, payload.floors, payload.quality_level, payload.project_type)
    project = Project(title=payload.title, description=payload.description, country=payload.country.upper(), city=payload.city, project_type=payload.project_type, surface_m2=payload.surface_m2, floors=payload.floors, quality_level=payload.quality_level, estimated_cost_local=est["total_cost_local"], estimated_cost_eur=est["total_cost_eur"], currency=est["currency"], materials_detail=est["materials_reference"], owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@app.get("/projects/{project_id}", response_model=ProjectOut, tags=["Projets"])
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project

@app.put("/projects/{project_id}", response_model=ProjectOut, tags=["Projets"])
def update_project(project_id: int, payload: ProjectUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    recalc_fields = {"surface_m2", "floors", "quality_level", "project_type"}
    if recalc_fields & set(update_data.keys()):
        country_data = db.query(CountryData).filter(CountryData.country_code == project.country).first()
        if country_data:
            est = compute_estimation(country_data, project.surface_m2, project.floors, project.quality_level, project.project_type)
            project.estimated_cost_local = est["total_cost_local"]
            project.estimated_cost_eur = est["total_cost_eur"]
            project.currency = est["currency"]
            project.materials_detail = est["materials_reference"]
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project

@app.delete("/projects/{project_id}", tags=["Projets"])
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(project)
    db.commit()
    return {"detail": "Projet supprimé"}

@app.get("/projects/{project_id}/estimation", response_model=EstimationOut, tags=["Projets"])
def get_estimation(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    country_data = db.query(CountryData).filter(CountryData.country_code == project.country).first()
    if not country_data:
        raise HTTPException(status_code=404, detail="Données pays introuvables")
    est = compute_estimation(country_data, project.surface_m2, project.floors, project.quality_level, project.project_type)
    return EstimationOut(country=project.country, country_name=country_data.country_name, currency=country_data.currency, surface_m2=project.surface_m2, floors=project.floors, quality_level=project.quality_level, cost_per_m2_local=est["cost_per_m2_local"], total_cost_local=est["total_cost_local"], total_cost_eur=est["total_cost_eur"], materials_reference=est["materials_reference"], disclaimer="Estimation indicative. Les prix réels peuvent varier selon les fournisseurs locaux et la période.")

@app.post("/estimate", response_model=EstimationOut, tags=["Projets"])
def quick_estimate(payload: ProjectCreate, db: Session = Depends(get_db)):
    country_data = db.query(CountryData).filter(CountryData.country_code == payload.country.upper()).first()
    if not country_data:
        raise HTTPException(status_code=404, detail=f"Pays '{payload.country}' non supporté")
    est = compute_estimation(country_data, payload.surface_m2, payload.floors, payload.quality_level, payload.project_type)
    return EstimationOut(country=payload.country.upper(), country_name=country_data.country_name, currency=country_data.currency, surface_m2=payload.surface_m2, floors=payload.floors, quality_level=payload.quality_level, cost_per_m2_local=est["cost_per_m2_local"], total_cost_local=est["total_cost_local"], total_cost_eur=est["total_cost_eur"], materials_reference=est["materials_reference"], disclaimer="Estimation indicative. Connectez-vous pour sauvegarder vos projets et accéder aux fonctionnalités avancées.")


# ─────────────────────────────────────────────
# ROUTES STRIPE
# ─────────────────────────────────────────────
@app.get("/plans", tags=["Abonnements"])
def list_plans():
    return [{"id": pid, "name": p["name"], "price_euros": p["price_euros"], "description": p["description"]} for pid, p in STRIPE_PLANS.items()]

@app.post("/stripe/checkout", response_model=CheckoutResponse, tags=["Abonnements"])
def create_checkout(payload: CheckoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    plan_key = payload.plan.upper()
    if plan_key not in STRIPE_PLANS:
        raise HTTPException(status_code=400, detail=f"Plan '{payload.plan}' invalide.")
    plan = STRIPE_PLANS[plan_key]
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(email=current_user.email, name=current_user.full_name, metadata={"user_id": current_user.id})
        current_user.stripe_customer_id = customer.id
        db.commit()
    try:
        session = stripe.checkout.Session.create(customer=current_user.stripe_customer_id, payment_method_types=["card"], line_items=[{"price": plan["price_id"], "quantity": 1}], mode="subscription", success_url=f"{FRONTEND_URL}/?checkout=success&plan={plan_key}", cancel_url=f"{FRONTEND_URL}/?checkout=cancelled", metadata={"user_id": str(current_user.id), "plan": plan_key}, subscription_data={"metadata": {"user_id": str(current_user.id), "plan": plan_key}})
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur Stripe : {str(e)}")
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if sub:
        sub.stripe_checkout_session_id = session.id
        sub.plan = plan_key
        db.commit()
    return CheckoutResponse(checkout_url=session.url, session_id=session.id)

@app.post("/stripe/webhook", tags=["Abonnements"])
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
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
                sub.plan = plan; sub.stripe_subscription_id = stripe_sub_id; sub.is_active = True; sub.updated_at = datetime.now(timezone.utc); db.commit()
    elif event_type == "customer.subscription.updated":
        stripe_sub_id = data.get("id"); status_val = data.get("status"); period_end = data.get("current_period_end")
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
        if sub:
            sub.is_active = status_val in ("active", "trialing")
            if period_end:
                sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
            sub.updated_at = datetime.now(timezone.utc); db.commit()
    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        stripe_sub_id = data.get("id")
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
        if sub:
            sub.is_active = False; sub.updated_at = datetime.now(timezone.utc); db.commit()
    elif event_type == "invoice.payment_failed":
        stripe_sub_id = data.get("subscription")
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
        if sub:
            sub.is_active = False; sub.updated_at = datetime.now(timezone.utc); db.commit()

@app.get("/subscription/me", response_model=SubscriptionOut, tags=["Abonnements"])
def my_subscription(current_user: User = Depends(get_current_user)):
    sub = current_user.subscription
    if not sub:
        return SubscriptionOut(plan="FREE", is_active=False, current_period_end=None)
    return SubscriptionOut(plan=sub.plan, is_active=sub.is_active, current_period_end=sub.current_period_end)


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────
@app.get("/mobile/dashboard", tags=["Dashboard"])
def mobile_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    sub = current_user.subscription
    total_cost = sum(p.estimated_cost_eur or 0 for p in projects)
    return {"user": {"id": current_user.id, "full_name": current_user.full_name, "email": current_user.email}, "stats": {"total_projects": len(projects), "estimated_projects": sum(1 for p in projects if p.status == "completed"), "draft_projects": sum(1 for p in projects if p.status == "draft"), "total_cost_eur": round(total_cost, 2)}, "subscription": {"plan": sub.plan if sub else "FREE", "is_active": sub.is_active if sub else False}}

@app.get("/mobile/plans", tags=["Dashboard"])
def mobile_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return [{"project_id": p.id, "project_name": p.title, "project_type": p.project_type, "country": p.country, "estimated_total_cost": p.estimated_cost_eur, "currency": "EUR", "quality_level": p.quality_level, "status": p.status, "created_at": p.created_at.isoformat() if p.created_at else None} for p in projects]

@app.get("/subscriptions", tags=["Abonnements"])
def list_subscriptions(current_user: User = Depends(get_current_user)):
    sub = current_user.subscription
    if not sub:
        return []
    return [{"plan_name": sub.plan, "is_active": sub.is_active, "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None, "stripe_subscription_id": sub.stripe_subscription_id}]

@app.get("/clients", tags=["Dashboard"])
def list_clients(current_user: User = Depends(get_current_user)):
    return []

@app.post("/clients", tags=["Dashboard"])
def create_client(current_user: User = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Fonctionnalité clients à venir")


# ─────────────────────────────────────────────
# SANTÉ
# ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "PHG BUILD IA API", "version": "2.0.0"}

@app.get("/health/db", tags=["System"])
def health_db(db: Session = Depends(get_db)):
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
    try:
        import ezdxf
        from ezdxf import colors
        import io
        doc = ezdxf.new("R2010")
        doc.header["$INSUNITS"] = 4
        doc.header["$MEASUREMENT"] = 1
        doc.layers.new("MURS_EXT", dxfattribs={"color": colors.WHITE, "lineweight": 50})
        doc.layers.new("MURS_INT", dxfattribs={"color": colors.CYAN, "lineweight": 25})
        doc.layers.new("COTES", dxfattribs={"color": colors.YELLOW, "lineweight": 13})
        doc.layers.new("TEXTES", dxfattribs={"color": colors.WHITE, "lineweight": 13})
        doc.layers.new("CADRE", dxfattribs={"color": 8, "lineweight": 13})
        msp = doc.modelspace()
        W = data.width * 1000; L = data.length * 1000; ep = 200
        msp.add_lwpolyline([(0,0),(W,0),(W,L),(0,L)], close=True, dxfattribs={"layer":"MURS_EXT","lineweight":70})
        msp.add_lwpolyline([(ep,ep),(W-ep,ep),(W-ep,L-ep),(ep,L-ep)], close=True, dxfattribs={"layer":"MURS_EXT","lineweight":70})
        if data.rooms:
            for room in data.rooms:
                rx=room.get("x",0)*1000; ry=room.get("y",0)*1000; rw=room.get("w",3)*1000; rh=room.get("h",3)*1000
                msp.add_lwpolyline([(rx+ep,ry+ep),(rx+rw-ep,ry+ep),(rx+rw-ep,ry+rh-ep),(rx+ep,ry+rh-ep)], close=True, dxfattribs={"layer":"MURS_INT"})
                msp.add_text(room.get("name","Pièce"), dxfattribs={"layer":"TEXTES","height":180,"insert":(rx+rw/2,ry+rh/2),"halign":1,"valign":2})
        else:
            _generate_generic_rooms(msp, W, L, ep, data.floors)
        dim=msp.add_linear_dim(base=(W/2,-600),p1=(0,0),p2=(W,0),dxfattribs={"layer":"COTES","dimscale":50}); dim.render()
        dim2=msp.add_linear_dim(base=(-600,L/2),p1=(0,0),p2=(0,L),angle=90,dxfattribs={"layer":"COTES","dimscale":50}); dim2.render()
        cx0,cy0=-200,-1400
        msp.add_lwpolyline([(cx0,cy0),(cx0+3000,cy0),(cx0+3000,cy0+1000),(cx0,cy0+1000)],close=True,dxfattribs={"layer":"CADRE"})
        msp.add_text("PHG BUILD IA",dxfattribs={"layer":"TEXTES","height":200,"insert":(cx0+150,cy0+700),"color":colors.YELLOW})
        msp.add_text(f"PROJET : {data.project_name}",dxfattribs={"layer":"TEXTES","height":130,"insert":(cx0+150,cy0+480)})
        msp.add_text(f"SURFACE : {data.width*data.length:.0f} m2  R+{data.floors-1}",dxfattribs={"layer":"TEXTES","height":130,"insert":(cx0+150,cy0+320)})
        stream=io.BytesIO(); doc.write(stream); stream.seek(0)
        from fastapi.responses import Response as FastResponse
        return FastResponse(content=stream.read(), media_type="application/octet-stream", headers={"Content-Disposition":f'attachment; filename="plan_{data.project_name.replace(" ","_")}.dxf"'})
    except ImportError:
        raise HTTPException(status_code=500, detail="ezdxf non installé.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _generate_generic_rooms(msp, W, L, ep, floors):
    rooms_def = []
    if W <= 6000:
        rooms_def = [{"name":"Studio","x":ep,"y":ep,"w":W-2*ep,"h":L-2*ep}]
    else:
        half_w=(W-2*ep)/2; third_l=(L-2*ep)/3
        rooms_def=[{"name":"Salon","x":ep,"y":ep+third_l*2,"w":W-2*ep,"h":third_l},{"name":"Cuisine","x":ep,"y":ep+third_l,"w":half_w-ep/2,"h":third_l},{"name":"SDB","x":ep+half_w+ep/2,"y":ep+third_l,"w":half_w-ep/2,"h":third_l},{"name":"Chambre 1","x":ep,"y":ep,"w":half_w-ep/2,"h":third_l},{"name":"Chambre 2","x":ep+half_w+ep/2,"y":ep,"w":half_w-ep/2,"h":third_l}]
    for r in rooms_def:
        msp.add_lwpolyline([(r["x"],r["y"]),(r["x"]+r["w"],r["y"]),(r["x"]+r["w"],r["y"]+r["h"]),(r["x"],r["y"]+r["h"])],close=True,dxfattribs={"layer":"MURS_INT"})
        msp.add_text(r["name"],dxfattribs={"layer":"TEXTES","height":max(100,min(200,r["h"]/8)),"insert":(r["x"]+r["w"]/2,r["y"]+r["h"]/2),"halign":1,"valign":2})


# ─────────────────────────────────────────────
# MODULE 3 — FOURNISSEURS
# ─────────────────────────────────────────────
SUPPLIERS_SEED = [
    {"name":"SOCOCIM Industries","country":"SN","category":"ciment","contact":"Direction commerciale","phone":"+221 33 839 50 00","email":"commercial@sococim.sn","address":"Rufisque, Sénégal","min_order_amount":500,"delivery_days":3,"rating":4.5,"price_level":"standard","is_verified":True},
    {"name":"CIM Ivoire","country":"CI","category":"ciment","contact":"Service vente","phone":"+225 27 21 24 20 00","email":"vente@cim-ivoire.ci","address":"Abidjan, Côte d'Ivoire","min_order_amount":600,"delivery_days":2,"rating":4.3,"price_level":"standard","is_verified":True},
    {"name":"CIMAF Cameroun","country":"CM","category":"ciment","contact":"Ventes directes","phone":"+237 222 22 40 00","email":"info@cimaf-cm.com","address":"Douala, Cameroun","min_order_amount":400,"delivery_days":4,"rating":4.0,"price_level":"low","is_verified":True},
    {"name":"Acier Maroc","country":"MA","category":"acier","contact":"Direction export","phone":"+212 522 44 00 00","email":"export@aciermaroc.ma","address":"Casablanca, Maroc","min_order_amount":2000,"delivery_days":7,"rating":4.6,"price_level":"standard","is_verified":True},
    {"name":"SONASID","country":"MA","category":"acier","contact":"Commercial","phone":"+212 537 71 60 00","email":"commercial@sonasid.ma","address":"Rabat, Maroc","min_order_amount":1500,"delivery_days":5,"rating":4.4,"price_level":"standard","is_verified":True},
    {"name":"Lafarge Côte d'Ivoire","country":"CI","category":"ciment","contact":"Service client","phone":"+225 27 22 40 35 00","email":"service.client@lafarge.ci","address":"Abidjan, CI","min_order_amount":700,"delivery_days":2,"rating":4.7,"price_level":"premium","is_verified":True},
    {"name":"Alucobond France","country":"FR","category":"aluminium","contact":"Devis","phone":"+33 1 42 00 00 00","email":"devis@alucobond.fr","address":"Paris, France","min_order_amount":5000,"delivery_days":10,"rating":4.8,"price_level":"premium","is_verified":True},
    {"name":"Carrelages Tropicaux","country":"CI","category":"carrelage","contact":"Showroom Abidjan","phone":"+225 07 00 11 22 33","email":"info@carrelages-tropicaux.ci","address":"Plateau, Abidjan","min_order_amount":300,"delivery_days":5,"rating":3.9,"price_level":"standard","is_verified":False},
    {"name":"PVC Sénégal","country":"SN","category":"plomberie","contact":"Magasin Dakar","phone":"+221 77 000 00 00","email":"dakar@pvc-senegal.sn","address":"Parcelles Assainies, Dakar","min_order_amount":200,"delivery_days":2,"rating":4.1,"price_level":"low","is_verified":False},
    {"name":"Électro-Africa","country":"CM","category":"électricité","contact":"Bureau technique","phone":"+237 677 00 00 00","email":"info@electro-africa.cm","address":"Yaoundé, Cameroun","min_order_amount":500,"delivery_days":3,"rating":4.2,"price_level":"standard","is_verified":True},
    {"name":"Bois Tropicaux Export","country":"GA","category":"bois","contact":"Direction export","phone":"+241 01 00 00 00","email":"export@bois-tropicaux.ga","address":"Libreville, Gabon","min_order_amount":3000,"delivery_days":15,"rating":4.3,"price_level":"standard","is_verified":True},
    {"name":"Tôles Burkina","country":"BF","category":"couverture","contact":"Ventes","phone":"+226 25 36 00 00","email":"ventes@toles-burkina.bf","address":"Ouagadougou, Burkina Faso","min_order_amount":400,"delivery_days":4,"rating":3.8,"price_level":"low","is_verified":False},
    {"name":"Peintures Mauger","country":"FR","category":"peinture","contact":"SAV","phone":"+33 2 35 00 00 00","email":"pro@mauger.fr","address":"Rouen, France","min_order_amount":1000,"delivery_days":7,"rating":4.5,"price_level":"premium","is_verified":True},
    {"name":"OTIS Ascenseurs Maroc","country":"MA","category":"ascenseur","contact":"Ingénierie","phone":"+212 522 00 00 00","email":"maroc@otis.com","address":"Casablanca, Maroc","min_order_amount":20000,"delivery_days":30,"rating":4.9,"price_level":"premium","is_verified":True},
    {"name":"Sanitaires Dakar","country":"SN","category":"sanitaire","contact":"Boutique","phone":"+221 33 000 00 00","email":"boutique@sanitaires-dk.sn","address":"Médina, Dakar","min_order_amount":150,"delivery_days":1,"rating":3.7,"price_level":"low","is_verified":False},
]

@app.get("/suppliers", response_model=List[SupplierOut], tags=["Fournisseurs"])
def get_suppliers(country: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Supplier)
    if country: q = q.filter(Supplier.country == country)
    if category: q = q.filter(Supplier.category == category)
    return q.all()

@app.post("/orders", response_model=OrderOut, tags=["Fournisseurs"])
def create_order(payload: OrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = SupplierOrder(user_id=current_user.id, supplier_id=payload.supplier_id, supplier_name=payload.supplier_name, items=payload.items, total_amount=payload.total_amount, currency=payload.currency, notes=payload.notes)
    db.add(order); db.commit(); db.refresh(order)
    return order

@app.get("/orders", response_model=List[OrderOut], tags=["Fournisseurs"])
def get_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SupplierOrder).filter(SupplierOrder.user_id == current_user.id).order_by(SupplierOrder.created_at.desc()).all()

@app.patch("/orders/{order_id}/status", response_model=OrderOut, tags=["Fournisseurs"])
def update_order_status(order_id: int, status: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(SupplierOrder).filter(SupplierOrder.id == order_id, SupplierOrder.user_id == current_user.id).first()
    if not order: raise HTTPException(404, "Commande introuvable")
    order.status = status; order.updated_at = datetime.now(timezone.utc); db.commit(); db.refresh(order)
    return order


# ─────────────────────────────────────────────
# MODULE 4 — GESTION DE CHANTIER
# ─────────────────────────────────────────────
@app.get("/chantier", response_model=List[ChantierOut], tags=["Chantier"])
def list_chantiers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Chantier).filter(Chantier.user_id == current_user.id).all()

@app.post("/chantier", response_model=ChantierOut, tags=["Chantier"])
def create_chantier(payload: ChantierCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = Chantier(user_id=current_user.id, **payload.dict()); db.add(c); db.commit(); db.refresh(c)
    return c

@app.get("/chantier/{cid}", response_model=ChantierOut, tags=["Chantier"])
def get_chantier(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Chantier).filter(Chantier.id == cid, Chantier.user_id == current_user.id).first()
    if not c: raise HTTPException(404, "Chantier introuvable")
    return c

@app.patch("/chantier/{cid}", response_model=ChantierOut, tags=["Chantier"])
def update_chantier(cid: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Chantier).filter(Chantier.id == cid, Chantier.user_id == current_user.id).first()
    if not c: raise HTTPException(404, "Chantier introuvable")
    for k, v in payload.items():
        if hasattr(c, k): setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c

@app.get("/chantier/{cid}/tasks", response_model=List[TaskOut], tags=["Chantier"])
def get_tasks(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChantierTask).filter(ChantierTask.chantier_id == cid).all()

@app.post("/chantier/{cid}/tasks", response_model=TaskOut, tags=["Chantier"])
def add_task(cid: int, payload: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = ChantierTask(chantier_id=cid, **payload.dict()); db.add(t); db.commit(); db.refresh(t)
    return t

@app.patch("/chantier/{cid}/tasks/{tid}", response_model=TaskOut, tags=["Chantier"])
def update_task(cid: int, tid: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(ChantierTask).filter(ChantierTask.id == tid, ChantierTask.chantier_id == cid).first()
    if not t: raise HTTPException(404, "Tâche introuvable")
    for k, v in payload.items():
        if hasattr(t, k): setattr(t, k, v)
    db.commit(); db.refresh(t)
    return t

@app.get("/chantier/{cid}/workers", response_model=List[WorkerOut], tags=["Chantier"])
def get_workers(cid: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChantierWorker).filter(ChantierWorker.chantier_id == cid).all()

@app.post("/chantier/{cid}/workers", response_model=WorkerOut, tags=["Chantier"])
def add_worker(cid: int, payload: WorkerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = ChantierWorker(chantier_id=cid, **payload.dict()); db.add(w); db.commit(); db.refresh(w)
    return w

@app.post("/chantier/{cid}/workers/{wid}/attendance", response_model=WorkerOut, tags=["Chantier"])
def mark_attendance(cid: int, wid: int, payload: WorkerAttendance, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = db.query(ChantierWorker).filter(ChantierWorker.id == wid, ChantierWorker.chantier_id == cid).first()
    if not w: raise HTTPException(404, "Ouvrier introuvable")
    if payload.present:
        w.present_days += 1
        if payload.amount: w.total_paid += payload.amount
        elif w.daily_rate: w.total_paid += w.daily_rate
    else:
        w.absent_days += 1
    db.commit(); db.refresh(w)
    return w

def seed_suppliers(db: Session):
    if db.query(Supplier).count() == 0:
        for s in SUPPLIERS_SEED:
            db.add(Supplier(**s))
        db.commit()


# ─────────────────────────────────────────────
# ASSISTANT PHG IA — Claude API
# ─────────────────────────────────────────────
PHG_IA_SYSTEM = """Tu es PHG IA, ingénieur senior BTP avec 20 ans d'expérience en Afrique et en Europe. Tu combines génie civil, architecture, thermique et gestion de chantier. Tu réponds avec précision et autorité d'expert."""

class AIChatMessage(BaseModel):
    role: str
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
    if not _ANTHROPIC_AVAILABLE:
        raise HTTPException(503, "Package 'anthropic' non installé.")
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "Clé API Anthropic non configurée.")
    if not payload.messages:
        raise HTTPException(400, "La liste de messages est vide.")
    for msg in payload.messages:
        if msg.role not in ("user", "assistant"):
            raise HTTPException(400, f"Rôle invalide : '{msg.role}'.")
    client = anthropic_sdk.Anthropic(api_key=ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(model="claude-sonnet-4-6", max_tokens=2048, system=PHG_IA_SYSTEM, messages=[{"role": m.role, "content": m.content} for m in payload.messages])
    except anthropic_sdk.AuthenticationError:
        raise HTTPException(401, "Clé API Anthropic invalide.")
    except anthropic_sdk.RateLimitError:
        raise HTTPException(429, "Limite Anthropic atteinte.")
    except Exception as e:
        raise HTTPException(500, f"Erreur API Anthropic : {str(e)}")
    return AIChatResponse(reply=response.content[0].text, input_tokens=response.usage.input_tokens, output_tokens=response.usage.output_tokens, model=response.model)


# ─────────────────────────────────────────────
# MODULE — ANALYSE DE DEVIS IA
# Route : POST /devis/analyser
# ─────────────────────────────────────────────
@app.post("/devis/analyser", response_model=DevisAnalyseResponse, tags=["Devis IA"])
async def analyser_devis(
    devis: UploadFile = File(...),
    photos: List[UploadFile] = File(default=[]),
):
    """Analyse un devis PDF avec Claude IA. Détecte prix abusifs, postes manquants, incohérences."""
    if not _ANTHROPIC_AVAILABLE:
        raise HTTPException(503, "Package 'anthropic' non installé.")
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "Clé API Anthropic non configurée.")

    fname = devis.filename.lower()
    if not fname.endswith(".pdf"):
        raise HTTPException(400, "Seuls les fichiers PDF sont acceptés.")

    pdf_content = await devis.read()
    if len(pdf_content) > 20 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop lourd (max 20 Mo).")

    pdf_b64 = base64.standard_b64encode(pdf_content).decode("utf-8")

    prompt_text = """Tu es PHG IA, expert senior en construction et BTP avec 20 ans d'expérience en Afrique et en Europe.

Analyse ce devis de construction en détail et retourne une réponse JSON structurée UNIQUEMENT (pas de texte autour).

Format JSON attendu :
{
  "succes": true,
  "resume": "Résumé exécutif en 2-3 phrases",
  "prix_abusifs": [
    {
      "poste": "Nom du poste",
      "prix_indique": "Prix dans le devis",
      "prix_normal": "Fourchette normale du marché",
      "ecart_percent": 35,
      "explication": "Pourquoi ce prix est abusif"
    }
  ],
  "postes_manquants": [
    {
      "poste": "Nom du poste manquant",
      "importance": "critique|importante|mineure",
      "cout_estime": "Estimation du coût",
      "explication": "Pourquoi ce poste devrait figurer"
    }
  ],
  "recommandations": [
    "Recommandation 1",
    "Recommandation 2"
  ],
  "score_fiabilite": 72,
  "rapport_complet": "Rapport détaillé complet en markdown avec toutes les observations"
}

Analyse notamment :
- Les prix unitaires (trop élevés ou trop bas vs marché local/international)
- Les postes habituellement oubliés (fondations, raccordements, finitions, TVA, etc.)
- La cohérence globale du devis
- Les risques pour le maître d'ouvrage
- Le score de fiabilité sur 100 (100 = devis parfait, 0 = devis frauduleux)

Réponds UNIQUEMENT avec le JSON, sans markdown ni backticks."""

    client = anthropic_sdk.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
                    {"type": "text", "text": prompt_text},
                ],
            }],
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        return DevisAnalyseResponse(
            succes=result.get("succes", True),
            resume=result.get("resume", ""),
            prix_abusifs=result.get("prix_abusifs", []),
            postes_manquants=result.get("postes_manquants", []),
            recommandations=result.get("recommandations", []),
            score_fiabilite=result.get("score_fiabilite", 50),
            rapport_complet=result.get("rapport_complet", ""),
        )

    except json.JSONDecodeError:
        return DevisAnalyseResponse(
            succes=True, resume="Analyse complétée.",
            prix_abusifs=[], postes_manquants=[],
            recommandations=[raw], score_fiabilite=50, rapport_complet=raw,
        )
    except anthropic_sdk.AuthenticationError:
        raise HTTPException(401, "Clé API Anthropic invalide.")
    except anthropic_sdk.RateLimitError:
        raise HTTPException(429, "Limite Anthropic atteinte.")
    except Exception as e:
        raise HTTPException(500, f"Erreur analyse: {str(e)}")


# ─────────────────────────────────────────────
# MODULE — RAPPORT PDF (Devis IA)
# Route : POST /devis/rapport-pdf
# ─────────────────────────────────────────────
class RapportPDFRequest(BaseModel):
    resume: str
    prix_abusifs: list = []
    postes_manquants: list = []
    recommandations: list = []
    score_fiabilite: int = 50
    rapport_complet: str = ""
    nom_fichier_devis: Optional[str] = "Devis"


@app.post("/devis/rapport-pdf", tags=["Devis IA"])
def generer_rapport_pdf(
    payload: RapportPDFRequest,
    current_user: User = Depends(require_subscription),
):
    """Génère un rapport PDF Pharaoh Gold à partir d'une analyse de devis déjà réalisée."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    import io

    GOLD = HexColor("#C9A84C")
    DARK = HexColor("#0D0D0D")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PHGTitle", parent=styles["Title"], textColor=GOLD,
        fontSize=22, alignment=TA_CENTER, spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "PHGSubtitle", parent=styles["Normal"], textColor=black,
        fontSize=10, alignment=TA_CENTER, spaceAfter=16,
    )
    h2_style = ParagraphStyle(
        "PHGH2", parent=styles["Heading2"], textColor=DARK,
        fontSize=14, spaceBefore=14, spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "PHGBody", parent=styles["Normal"], fontSize=10, leading=14,
        alignment=TA_LEFT,
    )
    score_style = ParagraphStyle(
        "PHGScore", parent=styles["Normal"], fontSize=16,
        textColor=GOLD, alignment=TA_CENTER, spaceAfter=16,
    )

    elements = []
    elements.append(Paragraph("PHG BUILD IA", title_style))
    elements.append(Paragraph("Rapport d'analyse de devis — Détection IA", subtitle_style))
    elements.append(Paragraph(f"Fichier analysé : {payload.nom_fichier_devis}", body_style))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph(f"Score de fiabilité : {payload.score_fiabilite}/100", score_style))

    elements.append(Paragraph("Résumé exécutif", h2_style))
    elements.append(Paragraph(payload.resume or "—", body_style))

    if payload.prix_abusifs:
        elements.append(Paragraph("Prix abusifs détectés", h2_style))
        data = [["Poste", "Prix indiqué", "Prix normal", "Écart"]]
        for item in payload.prix_abusifs:
            data.append([
                str(item.get("poste", "")),
                str(item.get("prix_indique", "")),
                str(item.get("prix_normal", "")),
                f"{item.get('ecart_percent', '')}%",
            ])
        table = Table(data, colWidths=[60 * mm, 35 * mm, 35 * mm, 25 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), GOLD),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#F5F0E0")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)

    if payload.postes_manquants:
        elements.append(Paragraph("Postes manquants", h2_style))
        data = [["Poste", "Importance", "Coût estimé"]]
        for item in payload.postes_manquants:
            data.append([
                str(item.get("poste", "")),
                str(item.get("importance", "")),
                str(item.get("cout_estime", "")),
            ])
        table = Table(data, colWidths=[70 * mm, 40 * mm, 45 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), GOLD),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#F5F0E0")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)

    if payload.recommandations:
        elements.append(Paragraph("Recommandations", h2_style))
        for rec in payload.recommandations:
            elements.append(Paragraph(f"• {rec}", body_style))

    if payload.rapport_complet:
        elements.append(PageBreak())
        elements.append(Paragraph("Rapport complet", h2_style))
        for line in payload.rapport_complet.split("\n"):
            if line.strip():
                elements.append(Paragraph(line, body_style))
                elements.append(Spacer(1, 4))

    doc.build(elements)
    buffer.seek(0)

    from fastapi.responses import Response as FastResponse
    return FastResponse(
        content=buffer.read(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Rapport_Devis_PHG_{payload.nom_fichier_devis.replace(" ", "_")}.pdf"'
        },
    )


# ─────────────────────────────────────────────
# PLAN 2D
# ─────────────────────────────────────────────
TIER_LIMITS = {"FREE":{"max_walls":30,"max_items":10,"pdf":False,"autosave":False},"PRO":{"max_walls":None,"max_items":None,"pdf":True,"autosave":True},"ELITE":{"max_walls":None,"max_items":None,"pdf":True,"autosave":True},"ELITE_AFRIQUE":{"max_walls":None,"max_items":None,"pdf":True,"autosave":True}}

class PlanMeta(BaseModel):
    scale: float = 1.0
    pan: dict = {"x":40,"y":40}

class PlanData(BaseModel):
    walls: List[dict] = []
    items: List[dict] = []
    labels: List[dict] = []
    sketches: List[dict] = []
    meta: PlanMeta = PlanMeta()
    thumbnail: Optional[str] = None

class PlanResponse(BaseModel):
    project_id: int
    walls: List[dict]
    items: List[dict]
    labels: List[dict]
    sketches: List[dict]
    meta: dict
    thumbnail: Optional[str] = None
    updated_at: Optional[str] = None
    tier: str = "FREE"
    limits: dict = {}

class PlanSummary(BaseModel):
    project_id: int
    thumbnail: Optional[str] = None
    wall_count: int = 0
    item_count: int = 0
    updated_at: Optional[str] = None

@app.get("/projects/plans/summaries", response_model=List[PlanSummary], tags=["Plan 2D"])
def get_plan_summaries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    result = []
    for p in projects:
        plan = db.query(Plan).filter(Plan.project_id == p.id).first()
        result.append(PlanSummary(project_id=p.id, thumbnail=plan.thumbnail if plan else None, wall_count=len(plan.walls) if plan and plan.walls else 0, item_count=len(plan.items) if plan and plan.items else 0, updated_at=str(plan.updated_at) if plan and plan.updated_at else None))
    return result

@app.get("/projects/{project_id}/plan", response_model=PlanResponse, tags=["Plan 2D"])
def get_plan(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not proj: raise HTTPException(404, "Projet introuvable")
    tier = current_user.subscription.plan if current_user.subscription else "FREE"
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["FREE"])
    plan = db.query(Plan).filter(Plan.project_id == project_id).first()
    if not plan: return PlanResponse(project_id=project_id, walls=[], items=[], labels=[], sketches=[], meta={"scale":1,"pan":{"x":40,"y":40}}, tier=tier, limits=limits)
    return PlanResponse(project_id=project_id, walls=plan.walls or [], items=plan.items or [], labels=plan.labels or [], sketches=plan.sketches or [], meta=plan.meta or {}, thumbnail=plan.thumbnail, updated_at=str(plan.updated_at) if plan.updated_at else None, tier=tier, limits=limits)

@app.post("/projects/{project_id}/plan", response_model=PlanResponse, tags=["Plan 2D"])
def save_plan(project_id: int, payload: PlanData, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not proj: raise HTTPException(404, "Projet introuvable")
    tier = current_user.subscription.plan if current_user.subscription else "FREE"
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["FREE"])
    if limits["max_walls"] and len(payload.walls) > limits["max_walls"]: raise HTTPException(403, "Limite murs atteinte. Passez en Pro.")
    if limits["max_items"] and len(payload.items) > limits["max_items"]: raise HTTPException(403, "Limite mobilier atteinte. Passez en Pro.")
    plan = db.query(Plan).filter(Plan.project_id == project_id).first()
    if plan:
        plan.walls=payload.walls; plan.items=payload.items; plan.labels=payload.labels; plan.sketches=payload.sketches; plan.meta=payload.meta.dict(); plan.thumbnail=payload.thumbnail; plan.updated_at=datetime.now(timezone.utc)
    else:
        plan = Plan(project_id=project_id, walls=payload.walls, items=payload.items, labels=payload.labels, sketches=payload.sketches, meta=payload.meta.dict(), thumbnail=payload.thumbnail)
        db.add(plan)
    db.commit(); db.refresh(plan)
    return PlanResponse(project_id=project_id, walls=plan.walls or [], items=plan.items or [], labels=plan.labels or [], sketches=plan.sketches or [], meta=plan.meta or {}, thumbnail=plan.thumbnail, updated_at=str(plan.updated_at), tier=tier, limits=limits)

@app.delete("/projects/{project_id}/plan", status_code=204, tags=["Plan 2D"])
def delete_plan(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not proj: raise HTTPException(404, "Projet introuvable")
    db.query(Plan).filter(Plan.project_id == project_id).delete()
    db.commit()


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("phg_build_ia_backend:app", host="0.0.0.0", port=8000, reload=True)
