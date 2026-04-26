#!/usr/bin/env python3
"""
PHG BUILD IA — Création des produits Stripe LIVE
Usage : STRIPE_SECRET_KEY=sk_live_... python create_stripe_live_products.py
"""
import os
import stripe

key = os.getenv("STRIPE_SECRET_KEY", "")
if not key.startswith("sk_live_"):
    print("❌ STRIPE_SECRET_KEY doit être une clé LIVE (sk_live_...)")
    print("   Usage : STRIPE_SECRET_KEY=sk_live_xxx python create_stripe_live_products.py")
    raise SystemExit(1)

stripe.api_key = key
print(f"✓ Clé LIVE détectée : {key[:18]}...")

PLANS = [
    {
        "key":         "STRIPE_PRICE_PRO",
        "name":        "PHG BUILD IA PRO",
        "description": "Accès Pro — estimations illimitées, PDF, fournisseurs",
        "amount":      1290,   # centimes EUR
        "interval":    "month",
    },
    {
        "key":         "STRIPE_PRICE_ELITE",
        "name":        "PHG BUILD IA ELITE Europe",
        "description": "Accès Elite — tout inclus + support prioritaire",
        "amount":      2500,
        "interval":    "month",
    },
    {
        "key":         "STRIPE_PRICE_ELITE_AFRIQUE",
        "name":        "PHG BUILD IA ELITE Afrique",
        "description": "Accès Elite Afrique — tarif réduit diaspora",
        "amount":      1700,
        "interval":    "month",
    },
]

print("\n─── Création des produits et prix Stripe LIVE ───\n")
results = {}

for plan in PLANS:
    product = stripe.Product.create(
        name=plan["name"],
        description=plan["description"],
    )
    price = stripe.Price.create(
        product=product.id,
        unit_amount=plan["amount"],
        currency="eur",
        recurring={"interval": plan["interval"]},
    )
    results[plan["key"]] = price.id
    print(f"✓ {plan['name']}")
    print(f"   Product ID : {product.id}")
    print(f"   Price ID   : {price.id}  ← copier dans Vercel\n")

print("─── Variables à configurer dans Vercel ───\n")
for env_key, price_id in results.items():
    print(f"{env_key}={price_id}")

print("\n→ Vercel Dashboard > Settings > Environment Variables")
print("  Ajoute les 3 lignes ci-dessus pour l'environnement Production.")
print("  Redéploie ensuite depuis Vercel (ou git push).\n")
