"""Initial schema — toutes les tables PHG BUILD IA

Revision ID: 001
Revises:
Create Date: 2026-04-16

Tables créées :
  users, projects, subscriptions, country_data,
  suppliers, supplier_orders,
  chantiers, chantier_tasks, chantier_workers
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",                  sa.Integer(),     primary_key=True),
        sa.Column("email",               sa.String(),      nullable=False),
        sa.Column("full_name",           sa.String(),      nullable=False),
        sa.Column("hashed_password",     sa.String(),      nullable=False),
        sa.Column("country",             sa.String(),      nullable=True),
        sa.Column("is_active",           sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("is_admin",            sa.Boolean(),     nullable=False, server_default="false"),
        sa.Column("stripe_customer_id",  sa.String(),      nullable=True),
        sa.Column("created_at",          sa.DateTime(),    nullable=True),
    )
    op.create_index("ix_users_id",    "users", ["id"],    unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── projects ──────────────────────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id",                   sa.Integer(),  primary_key=True),
        sa.Column("title",                sa.String(),   nullable=False),
        sa.Column("description",          sa.Text(),     nullable=True),
        sa.Column("country",              sa.String(),   nullable=False),
        sa.Column("city",                 sa.String(),   nullable=True),
        sa.Column("project_type",         sa.String(),   nullable=False),
        sa.Column("surface_m2",           sa.Float(),    nullable=False),
        sa.Column("floors",               sa.Integer(),  nullable=True, server_default="1"),
        sa.Column("quality_level",        sa.String(),   nullable=True, server_default="standard"),
        sa.Column("estimated_cost_local", sa.Float(),    nullable=True),
        sa.Column("estimated_cost_eur",   sa.Float(),    nullable=True),
        sa.Column("currency",             sa.String(),   nullable=True),
        sa.Column("materials_detail",     sa.JSON(),     nullable=True),
        sa.Column("status",               sa.String(),   nullable=True, server_default="draft"),
        sa.Column("owner_id",             sa.Integer(),  nullable=False),
        sa.Column("created_at",           sa.DateTime(), nullable=True),
        sa.Column("updated_at",           sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_projects_id", "projects", ["id"], unique=False)

    # ── subscriptions ─────────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id",                          sa.Integer(),  primary_key=True),
        sa.Column("user_id",                     sa.Integer(),  nullable=False),
        sa.Column("plan",                        sa.String(),   nullable=False),
        sa.Column("stripe_subscription_id",      sa.String(),   nullable=True),
        sa.Column("stripe_checkout_session_id",  sa.String(),   nullable=True),
        sa.Column("is_active",                   sa.Boolean(),  nullable=False, server_default="false"),
        sa.Column("current_period_end",          sa.DateTime(), nullable=True),
        sa.Column("created_at",                  sa.DateTime(), nullable=True),
        sa.Column("updated_at",                  sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_subscriptions_user_id"),
    )
    op.create_index("ix_subscriptions_id", "subscriptions", ["id"], unique=False)

    # ── country_data ──────────────────────────────────────────────────────────
    op.create_table(
        "country_data",
        sa.Column("id",               sa.Integer(), primary_key=True),
        sa.Column("country_code",     sa.String(),  nullable=False),
        sa.Column("country_name",     sa.String(),  nullable=False),
        sa.Column("currency",         sa.String(),  nullable=False),
        sa.Column("eur_rate",         sa.Float(),   nullable=False),
        sa.Column("cost_economique_m2", sa.Float(), nullable=False),
        sa.Column("cost_standard_m2",   sa.Float(), nullable=False),
        sa.Column("cost_premium_m2",    sa.Float(), nullable=False),
        sa.Column("materials",        sa.JSON(),    nullable=True),
        sa.Column("updated_at",       sa.DateTime(), nullable=True),
        sa.UniqueConstraint("country_code", name="uq_country_data_country_code"),
    )
    op.create_index("ix_country_data_id", "country_data", ["id"], unique=False)

    # ── suppliers ─────────────────────────────────────────────────────────────
    op.create_table(
        "suppliers",
        sa.Column("id",               sa.Integer(), primary_key=True),
        sa.Column("name",             sa.String(),  nullable=False),
        sa.Column("country",          sa.String(),  nullable=False),
        sa.Column("category",         sa.String(),  nullable=False),
        sa.Column("contact",          sa.String(),  nullable=True),
        sa.Column("phone",            sa.String(),  nullable=True),
        sa.Column("email",            sa.String(),  nullable=True),
        sa.Column("address",          sa.String(),  nullable=True),
        sa.Column("min_order_amount", sa.Float(),   nullable=True),
        sa.Column("delivery_days",    sa.Integer(), nullable=True),
        sa.Column("rating",           sa.Float(),   nullable=True, server_default="4.0"),
        sa.Column("price_level",      sa.String(),  nullable=True, server_default="standard"),
        sa.Column("is_verified",      sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at",       sa.DateTime(), nullable=True),
    )
    op.create_index("ix_suppliers_id", "suppliers", ["id"], unique=False)

    # ── supplier_orders ───────────────────────────────────────────────────────
    op.create_table(
        "supplier_orders",
        sa.Column("id",            sa.Integer(),  primary_key=True),
        sa.Column("user_id",       sa.Integer(),  nullable=False),
        sa.Column("supplier_id",   sa.Integer(),  nullable=True),
        sa.Column("supplier_name", sa.String(),   nullable=False),
        sa.Column("items",         sa.JSON(),     nullable=False),
        sa.Column("total_amount",  sa.Float(),    nullable=False),
        sa.Column("currency",      sa.String(),   nullable=True, server_default="EUR"),
        sa.Column("status",        sa.String(),   nullable=True, server_default="pending"),
        sa.Column("notes",         sa.Text(),     nullable=True),
        sa.Column("created_at",    sa.DateTime(), nullable=True),
        sa.Column("updated_at",    sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"],     ["users.id"]),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
    )
    op.create_index("ix_supplier_orders_id", "supplier_orders", ["id"], unique=False)

    # ── chantiers ─────────────────────────────────────────────────────────────
    op.create_table(
        "chantiers",
        sa.Column("id",         sa.Integer(),  primary_key=True),
        sa.Column("user_id",    sa.Integer(),  nullable=False),
        sa.Column("name",       sa.String(),   nullable=False),
        sa.Column("location",   sa.String(),   nullable=True),
        sa.Column("project_id", sa.Integer(),  nullable=True),
        sa.Column("start_date", sa.String(),   nullable=True),
        sa.Column("end_date",   sa.String(),   nullable=True),
        sa.Column("budget",     sa.Float(),    nullable=True),
        sa.Column("spent",      sa.Float(),    nullable=True, server_default="0"),
        sa.Column("progress",   sa.Integer(),  nullable=True, server_default="0"),
        sa.Column("status",     sa.String(),   nullable=True, server_default="planifie"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"],    ["users.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
    )
    op.create_index("ix_chantiers_id", "chantiers", ["id"], unique=False)

    # ── chantier_tasks ────────────────────────────────────────────────────────
    op.create_table(
        "chantier_tasks",
        sa.Column("id",          sa.Integer(),  primary_key=True),
        sa.Column("chantier_id", sa.Integer(),  nullable=False),
        sa.Column("title",       sa.String(),   nullable=False),
        sa.Column("category",    sa.String(),   nullable=True),
        sa.Column("week",        sa.Integer(),  nullable=True),
        sa.Column("status",      sa.String(),   nullable=True, server_default="planifie"),
        sa.Column("assigned_to", sa.String(),   nullable=True),
        sa.Column("budget",      sa.Float(),    nullable=True),
        sa.Column("paid",        sa.Float(),    nullable=True, server_default="0"),
        sa.Column("notes",       sa.Text(),     nullable=True),
        sa.Column("created_at",  sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["chantier_id"], ["chantiers.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_chantier_tasks_id", "chantier_tasks", ["id"], unique=False)

    # ── chantier_workers ──────────────────────────────────────────────────────
    op.create_table(
        "chantier_workers",
        sa.Column("id",            sa.Integer(),  primary_key=True),
        sa.Column("chantier_id",   sa.Integer(),  nullable=False),
        sa.Column("name",          sa.String(),   nullable=False),
        sa.Column("role",          sa.String(),   nullable=True),
        sa.Column("daily_rate",    sa.Float(),    nullable=True),
        sa.Column("phone",         sa.String(),   nullable=True),
        sa.Column("present_days",  sa.Integer(),  nullable=True, server_default="0"),
        sa.Column("absent_days",   sa.Integer(),  nullable=True, server_default="0"),
        sa.Column("total_paid",    sa.Float(),    nullable=True, server_default="0"),
        sa.ForeignKeyConstraint(["chantier_id"], ["chantiers.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_chantier_workers_id", "chantier_workers", ["id"], unique=False)


def downgrade() -> None:
    # Suppression dans l'ordre inverse (respecter les FK)
    op.drop_table("chantier_workers")
    op.drop_table("chantier_tasks")
    op.drop_table("chantiers")
    op.drop_table("supplier_orders")
    op.drop_table("suppliers")
    op.drop_table("country_data")
    op.drop_table("subscriptions")
    op.drop_table("projects")
    op.drop_table("users")
