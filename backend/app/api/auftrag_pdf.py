from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io, base64

BLAU     = colors.HexColor("#1a3d6e")
GELB     = colors.HexColor("#f59e0b")
HELLGRAU = colors.HexColor("#f8fafc")
GRAU     = colors.HexColor("#e8edf2")
DUNKEL   = colors.HexColor("#0f1923")

TYP_LABELS = {
    "wartung": "Wartung", "kundendienst": "Kundendienst",
    "installation": "Installation", "reparatur": "Reparatur",
    "inspektion": "Inspektion", "notfall": "Notfalleinsatz", "sonstiges": "Sonstiges"
}

def erstelle_auftrag_pdf(auftrag, rz) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm, topMargin=15*mm, bottomMargin=20*mm)

    styles = getSampleStyleSheet()
    s_titel  = ParagraphStyle("t", fontSize=9, textColor=DUNKEL, leading=12)
    s_fett   = ParagraphStyle("f", fontSize=9, fontName="Helvetica-Bold", textColor=DUNKEL, leading=12)
    s_klein  = ParagraphStyle("k", fontSize=7, textColor=colors.grey, leading=10)
    s_center = ParagraphStyle("c", fontSize=8, alignment=TA_CENTER, textColor=colors.grey)

    el = []

    # ── Kopf ──────────────────────────────────────────────────────────────────
    kopf = [[
        Paragraph(f"<b><font size='18' color='#{BLAU.hexval()[2:]}'>ELEKTRO PEPEL</font></b><br/>"
                  f"<font size='9' color='grey'>Regiezettel · {TYP_LABELS.get(str(auftrag.typ), auftrag.typ)}</font>", s_titel),
        Paragraph(
            f"<b>Auftrag:</b> {auftrag.auftragsnummer}<br/>"
            f"<b>Datum:</b> {rz.datum.strftime('%d.%m.%Y')}<br/>"
            f"<font size='8' color='grey'>Erstellt: {datetime.now().strftime('%d.%m.%Y %H:%M')}</font>",
            ParagraphStyle("r", fontSize=9, alignment=TA_RIGHT, leading=13)
        )
    ]]
    el.append(Table(kopf, colWidths=[110*mm, 60*mm]))
    el.append(HRFlowable(width="100%", thickness=2, color=GELB, spaceAfter=6))

    # ── Kunden & Auftragsdaten ─────────────────────────────────────────────────
    def zeile(label, wert):
        return [Paragraph(f"<b>{label}</b>", s_fett), Paragraph(str(wert) if wert else "—", s_titel)]

    info = [
        zeile("Auftragsbezeichnung:", auftrag.titel),
        zeile("Kunde:", auftrag.kunde_name),
        zeile("Adresse:", auftrag.kunde_adresse or "—"),
        zeile("Telefon:", auftrag.kunde_telefon or "—"),
        zeile("E-Mail:", auftrag.kunde_email or "—"),
    ]
    if auftrag.termin_datum:
        termin = auftrag.termin_datum.strftime('%d.%m.%Y')
        if auftrag.termin_von:
            termin += f"  {auftrag.termin_von}"
            if auftrag.termin_bis:
                termin += f" – {auftrag.termin_bis} Uhr"
        info.append(zeile("Termin:", termin))

    t_info = Table(info, colWidths=[42*mm, 128*mm])
    t_info.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [HELLGRAU, colors.white]),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6), ("GRID", (0,0), (-1,-1), 0.3, GRAU),
    ]))
    el.append(t_info)
    el.append(Spacer(1, 5*mm))

    # ── Arbeitszeit ───────────────────────────────────────────────────────────
    el.append(Paragraph("<b>Arbeitszeit</b>", ParagraphStyle("h", fontSize=10, fontName="Helvetica-Bold", textColor=BLAU, spaceBefore=4, spaceAfter=4)))

    az_data = [["Datum", "Beginn", "Ende", "Pause", "Nettostunden", "Mitarbeiter"]]
    ma_str = ", ".join(rz.mitarbeiter_namen or [rz.erstellt_von.vollname if rz.erstellt_von else "—"])
    az_data.append([
        rz.datum.strftime("%d.%m.%Y"),
        rz.beginn_uhr or "—",
        rz.ende_uhr or "—",
        f"{rz.pause_minuten} min",
        f"{rz.arbeitsstunden:.2f} h" if rz.arbeitsstunden else "—",
        ma_str[:40],
    ])
    t_az = Table(az_data, colWidths=[24*mm, 18*mm, 18*mm, 18*mm, 24*mm, 68*mm])
    t_az.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), BLAU), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ALIGN", (0,0), (-1,-1), "CENTER"), ("ROWBACKGROUNDS", (0,1), (-1,-1), [HELLGRAU]),
        ("GRID", (0,0), (-1,-1), 0.3, GRAU), ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    el.append(t_az)
    el.append(Spacer(1, 4*mm))

    # ── Tätigkeit ─────────────────────────────────────────────────────────────
    if rz.taetigkeit:
        el.append(Paragraph("<b>Durchgeführte Arbeiten</b>", ParagraphStyle("h", fontSize=10, fontName="Helvetica-Bold", textColor=BLAU, spaceAfter=4)))
        el.append(Table([[Paragraph(rz.taetigkeit, s_titel)]], colWidths=[170*mm],
                        style=[("BACKGROUND",(0,0),(-1,-1),HELLGRAU),("TOPPADDING",(0,0),(-1,-1),6),
                               ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
                               ("GRID",(0,0),(-1,-1),0.3,GRAU)]))
        el.append(Spacer(1, 4*mm))

    # ── Materialien ───────────────────────────────────────────────────────────
    materialien = rz.materialien or []
    if materialien:
        el.append(Paragraph("<b>Verwendete Materialien</b>", ParagraphStyle("h", fontSize=10, fontName="Helvetica-Bold", textColor=BLAU, spaceAfter=4)))
        mat_rows = [["#", "Bezeichnung", "Menge", "Einheit", "Preis/Einheit", "Gesamt"]]
        gesamt_preis = 0
        for i, m in enumerate(materialien, 1):
            menge = float(m.get("menge", 0) or 0)
            preis = float(m.get("preis", 0) or 0)
            gesamt = menge * preis
            gesamt_preis += gesamt
            mat_rows.append([
                str(i),
                m.get("bezeichnung", "—"),
                str(m.get("menge", "—")),
                m.get("einheit", "Stk"),
                f"{preis:.2f} €" if preis else "—",
                f"{gesamt:.2f} €" if preis else "—",
            ])
        if gesamt_preis > 0:
            mat_rows.append(["", "", "", "", Paragraph("<b>Gesamt Material:</b>", s_fett), Paragraph(f"<b>{gesamt_preis:.2f} €</b>", s_fett)])

        t_mat = Table(mat_rows, colWidths=[8*mm, 72*mm, 16*mm, 16*mm, 28*mm, 28*mm])
        t_mat.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), BLAU), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,1), (-1,-2), [colors.white, HELLGRAU]),
            ("GRID", (0,0), (-1,-1), 0.3, GRAU),
            ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING", (0,0), (-1,-1), 4),
            ("BACKGROUND", (0,-1), (-1,-1), colors.HexColor("#fef9c3")),
        ]))
        el.append(t_mat)
        el.append(Spacer(1, 4*mm))

    # ── Notizen ───────────────────────────────────────────────────────────────
    if rz.notizen:
        el.append(Paragraph("<b>Notizen / Bemerkungen</b>", ParagraphStyle("h", fontSize=10, fontName="Helvetica-Bold", textColor=BLAU, spaceAfter=4)))
        el.append(Table([[Paragraph(rz.notizen, s_titel)]], colWidths=[170*mm],
                        style=[("BACKGROUND",(0,0),(-1,-1),HELLGRAU),("TOPPADDING",(0,0),(-1,-1),6),
                               ("BOTTOMPADDING",(0,0),(-1,-1),6),("LEFTPADDING",(0,0),(-1,-1),8),
                               ("GRID",(0,0),(-1,-1),0.3,GRAU)]))
        el.append(Spacer(1, 6*mm))

    # ── Unterschriften ────────────────────────────────────────────────────────
    el.append(HRFlowable(width="100%", thickness=0.5, color=GRAU))
    el.append(Spacer(1, 4*mm))

    def unterschrift_block(titel, b64_data, name):
        block = [Paragraph(f"<b>{titel}</b>", ParagraphStyle("u", fontSize=9, fontName="Helvetica-Bold", textColor=DUNKEL))]
        if b64_data:
            try:
                img_data = base64.b64decode(b64_data.split(",")[-1])
                img_buffer = io.BytesIO(img_data)
                img = Image(img_buffer, width=60*mm, height=20*mm)
                block.append(img)
            except:
                block.append(Spacer(1, 20*mm))
        else:
            block.append(Spacer(1, 20*mm))
        block.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
        block.append(Paragraph(name or "Unterschrift", s_klein))
        return block

    u_ma = unterschrift_block("Mitarbeiter", rz.unterschrift_mitarbeiter,
                              rz.erstellt_von.vollname if rz.erstellt_von else "Mitarbeiter")
    u_ku = unterschrift_block("Kunde / Auftraggeber", rz.unterschrift_kunde, auftrag.kunde_name)

    u_table = Table([[u_ma, Spacer(10*mm, 1), u_ku]], colWidths=[75*mm, 20*mm, 75*mm])
    u_table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    el.append(u_table)
    el.append(Spacer(1, 6*mm))

    # ── Fußzeile ──────────────────────────────────────────────────────────────
    el.append(HRFlowable(width="100%", thickness=0.3, color=GRAU))
    el.append(Paragraph(
        f"<font size='7' color='grey'>Elektro Pepel | Auftrag {auftrag.auftragsnummer} | "
        f"Erstellt am {datetime.now().strftime('%d.%m.%Y %H:%M')} | "
        f"Aufbewahrungspflicht gemäß § 147 AO: 10 Jahre</font>",
        s_center
    ))

    doc.build(el)
    return buffer.getvalue()