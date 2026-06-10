from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io
from datetime import datetime

# Firmenfarbe (Elektro-Blau)
BLAU = colors.HexColor("#1a3d6e")
HELLBLAU = colors.HexColor("#e8f0fb")
GRAU = colors.HexColor("#f5f5f5")
DUNKELGRAU = colors.HexColor("#333333")

def erstelle_regiezettel_pdf(regiezettel) -> bytes:
    buffer = io.BytesIO()
    snap = regiezettel.daten_snapshot

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=20*mm,
    )

    styles = getSampleStyleSheet()
    style_titel = ParagraphStyle("titel", parent=styles["Normal"], fontSize=18, textColor=BLAU, fontName="Helvetica-Bold", spaceAfter=4)
    style_h2    = ParagraphStyle("h2",    parent=styles["Normal"], fontSize=11, textColor=BLAU, fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4)
    style_body  = ParagraphStyle("body",  parent=styles["Normal"], fontSize=9,  textColor=DUNKELGRAU, leading=14)
    style_small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8,  textColor=colors.grey)
    style_center = ParagraphStyle("center", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER)

    elements = []

    # ── Kopfzeile ──────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph(
            f"<b><font color='#{BLAU.hexval()[2:]}'>ELEKTRO PEPEL</font></b><br/>"
            f"<font size='9' color='grey'>Regiezettel</font>",
            ParagraphStyle("rz", fontSize=20, fontName="Helvetica-Bold", textColor=BLAU, leading=26)
        ),
        Paragraph(
            f"Nr. {regiezettel.id:05d}<br/>"
            f"<font size='8' color='grey'>Erstellt: {datetime.now().strftime('%d.%m.%Y')}</font>",
            ParagraphStyle("nr", fontSize=10, alignment=TA_RIGHT)
        ),
    ]]
    header_table = Table(header_data, colWidths=[120*mm, 50*mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LINEBELOW", (0,0), (-1,0), 2, BLAU),
        ("BOTTOMPADDING", (0,0), (-1,0), 6),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5*mm))

    # ── Baustellen- & Kundendaten ──────────────────────────────────────────────
    bs = snap.get("baustelle", {})
    zeitraum = snap.get("zeitraum", {})

    info_data = [
        ["Baustelle:", bs.get("name", "-"),        "Auftrags-Nr.:",    bs.get("auftragsnummer", "-")],
        ["Adresse:",   bs.get("adresse", "-"),      "Zeitraum:",        f"{zeitraum.get('von','')[:10]} – {zeitraum.get('bis','')[:10]}"],
        ["Kunde:",     bs.get("kunde", "-"),         "Kunden-Adresse:", bs.get("kunde_adresse", "-")],
    ]
    info_table = Table(info_data, colWidths=[28*mm, 60*mm, 32*mm, 50*mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("BACKGROUND", (0,0), (-1,-1), GRAU),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [HELLBLAU, GRAU, HELLBLAU]),
        ("GRID", (0,0), (-1,-1), 0.3, colors.lightgrey),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # ── Zeiteinträge ──────────────────────────────────────────────────────────
    elements.append(Paragraph("Geleistete Arbeitszeit", style_h2))

    zeit_header = ["Datum", "Mitarbeiter", "Beginn", "Ende", "Pause", "Stunden", "Tätigkeit"]
    zeit_rows = [zeit_header]

    eintraege = snap.get("eintraege", [])
    for e in eintraege:
        taetigkeit = (e.get("taetigkeit") or "-")[:50]
        zeit_rows.append([
            e.get("datum", "")[:10],
            e.get("mitarbeiter", "-"),
            e.get("beginn", "-"),
            e.get("ende", "-"),
            f"{e.get('pause_min', 0)} min",
            f"{e.get('stunden', 0):.2f} h",
            taetigkeit,
        ])

    # Summenzeile
    gesamt = snap.get("gesamt_stunden", 0)
    zeit_rows.append(["", "", "", "", "Gesamt:", f"{gesamt:.2f} h", ""])

    zeit_table = Table(zeit_rows, colWidths=[22*mm, 38*mm, 14*mm, 14*mm, 14*mm, 18*mm, 50*mm], repeatRows=1)
    zeit_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0,0), (-1,0), BLAU),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,0), 8),
        ("ALIGN", (0,0), (-1,0), "CENTER"),
        # Datenzeilen
        ("FONTSIZE", (0,1), (-1,-2), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-2), [colors.white, GRAU]),
        ("GRID", (0,0), (-1,-1), 0.3, colors.lightgrey),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        # Summenzeile
        ("BACKGROUND", (0,-1), (-1,-1), HELLBLAU),
        ("FONTNAME", (4,-1), (5,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,-1), (-1,-1), 9),
        ("ALIGN", (4,-1), (5,-1), "RIGHT"),
    ]))
    elements.append(zeit_table)
    elements.append(Spacer(1, 4*mm))

    # ── Materialien ───────────────────────────────────────────────────────────
    alle_materialien = []
    for e in eintraege:
        for m in (e.get("materialien") or []):
            alle_materialien.append({**m, "datum": e.get("datum","")[:10], "ma": e.get("mitarbeiter","")})

    if alle_materialien:
        elements.append(Paragraph("Verwendete Materialien", style_h2))
        mat_header = ["Datum", "Mitarbeiter", "Bezeichnung", "Menge"]
        mat_rows = [mat_header] + [
            [m.get("datum","-"), m.get("ma","-"), m.get("bezeichnung","-"), m.get("menge","-")]
            for m in alle_materialien
        ]
        mat_table = Table(mat_rows, colWidths=[22*mm, 40*mm, 70*mm, 38*mm], repeatRows=1)
        mat_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), BLAU),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, GRAU]),
            ("GRID", (0,0), (-1,-1), 0.3, colors.lightgrey),
            ("TOPPADDING", (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING", (0,0), (-1,-1), 4),
        ]))
        elements.append(mat_table)
        elements.append(Spacer(1, 4*mm))

    # ── Notizen ───────────────────────────────────────────────────────────────
    if regiezettel.notizen:
        elements.append(Paragraph("Notizen / Bemerkungen", style_h2))
        elements.append(Paragraph(regiezettel.notizen, style_body))
        elements.append(Spacer(1, 4*mm))

    # ── Unterschriften ────────────────────────────────────────────────────────
    elements.append(Spacer(1, 8*mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Spacer(1, 4*mm))

    unterschrift_data = [
        [
            Paragraph("Bauleiter / Vorgesetzter", style_center),
            Paragraph("", style_center),
            Paragraph("Kunde / Auftraggeber", style_center),
        ],
        [
            Paragraph("<br/><br/><br/>_______________________<br/>Unterschrift, Datum", style_center),
            Paragraph("", style_center),
            Paragraph("<br/><br/><br/>_______________________<br/>Unterschrift, Datum", style_center),
        ]
    ]
    u_table = Table(unterschrift_data, colWidths=[65*mm, 40*mm, 65*mm])
    u_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 4),
    ]))
    elements.append(u_table)

    # ── Fußzeile ──────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 6*mm))
    elements.append(HRFlowable(width="100%", thickness=0.3, color=colors.lightgrey))
    elements.append(Paragraph(
        f"<font size='7' color='grey'>Elektro Pepel | Erstellt von: {snap.get('erstellt_von','')} | "
        f"Automatisch generiert | Aufbewahrungspflicht gemäß § 147 AO: 10 Jahre</font>",
        style_center
    ))

    doc.build(elements)
    return buffer.getvalue()
