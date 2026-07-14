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
