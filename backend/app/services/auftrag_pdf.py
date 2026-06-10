from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io, base64, os

# ── Farben ────────────────────────────────────────────────────────────────────
GELB    = colors.HexColor("#f0b800")
DUNKEL  = colors.HexColor("#1a1a1a")
GRAU    = colors.HexColor("#f5f5f5")
HELLGRAU= colors.HexColor("#e8e8e8")
ROT     = colors.HexColor("#cc0000")
WEISS   = colors.white

LOGO_PATH = os.path.join(os.path.dirname(__file__), "logo_pepel.png")

TYP_LABELS = {
    "wartung":"Wartung","kundendienst":"Kundendienst",
    "installation":"Installation","reparatur":"Reparatur",
    "inspektion":"Inspektion","notfall":"Notfalleinsatz","sonstiges":"Sonstiges"
}

def p(text, size=8, bold=False, color=DUNKEL, align=TA_LEFT, leading=None):
    return Paragraph(f"{'<b>' if bold else ''}{text}{'</b>' if bold else ''}", ParagraphStyle(
        "x", fontSize=size, fontName="Helvetica-Bold" if bold else "Helvetica",
        textColor=color, alignment=align, leading=leading or (size+3)
    ))


def erstelle_auftrag_pdf(auftrag, rz) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm, topMargin=12*mm, bottomMargin=18*mm)
    W = 180*mm  # nutzbare Breite
    el = []

    # ══════════════════════════════════════════════════════════════════════════
    # KOPFZEILE — Logo links, Firmeninfo rechts (wie Referenz)
    # ══════════════════════════════════════════════════════════════════════════
    logo_cell = ""
    if os.path.exists(LOGO_PATH):
        try:
            logo_cell = RLImage(LOGO_PATH, width=35*mm, height=33*mm)
        except:
            logo_cell = p("ELEKTRO PEPEL GmbH", 14, bold=True)

    firma_info = [
        p("Elektro Pepel GmbH", 13, bold=True, color=DUNKEL),
        p("Musterstraße 1 · 90000 Fürth", 8, color=colors.grey),
        p("Tel: 0911 000-0 · Fax: 0911 000-1", 8, color=colors.grey),
        p("info@elektro-pepel.de", 8, color=colors.grey),
    ]

    kopf = Table([[logo_cell, "", Table([[x] for x in firma_info],
        colWidths=[85*mm],
        style=[("ALIGN",(0,0),(-1,-1),"RIGHT"),
               ("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1)]
    )]], colWidths=[40*mm, 55*mm, 85*mm])
    kopf.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    el.append(kopf)

    # Gelber Trennbalken
    el.append(Spacer(1, 3*mm))
    el.append(Table([[""]], colWidths=[W], rowHeights=[3*mm],
        style=[("BACKGROUND",(0,0),(-1,-1),GELB)]))
    el.append(Spacer(1, 3*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # REGIE-ZETTEL TITEL + NUMMER (wie Referenz: groß, markant)
    # ══════════════════════════════════════════════════════════════════════════
    titel_row = Table([[
        p("Regiezettel", 18, bold=True, color=DUNKEL),
        p(f"Nr. {auftrag.auftragsnummer}", 22, bold=True, color=GELB, align=TA_RIGHT),
    ]], colWidths=[90*mm, 90*mm])
    titel_row.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    el.append(titel_row)

    typ_label = TYP_LABELS.get(str(auftrag.typ), str(auftrag.typ))
    el.append(Table([[
        p(f"Auftragsart: {typ_label}", 9, color=colors.grey),
        p(f"Datum: {rz.datum.strftime('%d.%m.%Y')}   Erstellt: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
          9, color=colors.grey, align=TA_RIGHT),
    ]], colWidths=[90*mm, 90*mm]))
    el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # ZWEISPALTIG: Empfänger links | Auftraggeber rechts
    # ══════════════════════════════════════════════════════════════════════════
    def info_block(titel, zeilen):
        rows = [[p(titel, 7, bold=True, color=WEISS)]]
        for z in zeilen:
            rows.append([p(z, 8)])
        t = Table(rows, colWidths=[87*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),DUNKEL),
            ("BACKGROUND",(0,1),(-1,-1),GRAU),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),6),
            ("GRID",(0,0),(-1,-1),0.3,HELLGRAU),
        ]))
        return t

    kunde_zeilen = [
        auftrag.kunde_name,
        auftrag.kunde_adresse or "",
        auftrag.kunde_telefon or "",
        auftrag.kunde_email or "",
    ]
    mitarbeiter_zeilen = [
        m.get("name","") if isinstance(m,dict) else str(m)
        for m in (rz.mitarbeiter_namen or [])
    ] or [rz.erstellt_von.vollname if rz.erstellt_von else "—"]

    termin_str = ""
    if auftrag.termin_datum:
        termin_str = auftrag.termin_datum.strftime("%d.%m.%Y")
        if auftrag.termin_von:
            termin_str += f"  {auftrag.termin_von}"
            if auftrag.termin_bis:
                termin_str += f"–{auftrag.termin_bis} Uhr"

    zweispaltig = Table([[
        info_block("Empfänger / Auftraggeber", [x for x in kunde_zeilen if x]),
        Spacer(6*mm, 1),
        info_block("Mitarbeiter / Monteure", mitarbeiter_zeilen + ([f"Termin: {termin_str}"] if termin_str else [])),
    ]], colWidths=[87*mm, 6*mm, 87*mm])
    zweispaltig.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP")]))
    el.append(zweispaltig)
    el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # AUFTRAGSINFO
    # ══════════════════════════════════════════════════════════════════════════
    el.append(Table([[p("Auftragsbezeichnung", 7, bold=True, color=WEISS)]],
        colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LEFTPADDING",(0,0),(-1,-1),6)]))
    el.append(Table([[p(auftrag.titel, 9, bold=True)]],
        colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),GRAU),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("LEFTPADDING",(0,0),(-1,-1),6)]))
    el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # ARBEITSZEIT
    # ══════════════════════════════════════════════════════════════════════════
    el.append(Table([[p("Arbeitszeit", 7, bold=True, color=WEISS)]],
        colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LEFTPADDING",(0,0),(-1,-1),6)]))

    az_header = [p(x,7,bold=True,color=WEISS) for x in ["Datum","Von","Bis","Pause","Netto Std.","Monteur"]]
    ma_str = ", ".join(rz.mitarbeiter_namen or []) or (rz.erstellt_von.vollname if rz.erstellt_von else "—")
    az_data = [az_header, [
        p(rz.datum.strftime("%d.%m.%Y"),8),
        p(rz.beginn_uhr or "—",8),
        p(rz.ende_uhr or "—",8),
        p(f"{rz.pause_minuten} min",8),
        p(f"{rz.arbeitsstunden:.2f} h" if rz.arbeitsstunden else "—",8,bold=True),
        p(ma_str[:35],8),
    ]]
    t_az = Table(az_data, colWidths=[22*mm,16*mm,16*mm,16*mm,20*mm,90*mm])
    t_az.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#555555")),
        ("TEXTCOLOR",(0,0),(-1,0),WEISS),
        ("BACKGROUND",(0,1),(-1,-1),GRAU),
        ("GRID",(0,0),(-1,-1),0.3,HELLGRAU),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LEFTPADDING",(0,0),(-1,-1),4),
    ]))
    el.append(t_az)
    el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # TÄTIGKEITSBESCHREIBUNG
    # ══════════════════════════════════════════════════════════════════════════
    if rz.taetigkeit:
        el.append(Table([[p("Tätigkeitsbeschreibung / Durchgeführte Arbeiten", 7, bold=True, color=WEISS)]],
            colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),6)]))
        el.append(Table([[p(rz.taetigkeit, 8.5)]],
            colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),GRAU),
            ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1),6)]))
        el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # MATERIALIEN (wie Referenz: mit Artikelnummern, Mengen, Preisen)
    # ══════════════════════════════════════════════════════════════════════════
    materialien = rz.materialien or []
    if materialien:
        el.append(Table([[p("Verwendete Materialien / Artikel", 7, bold=True, color=WEISS)]],
            colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),6)]))

        mat_header = [p(x,7,bold=True,color=WEISS) for x in
                      ["Pos.","Bezeichnung","Menge","Einheit","Preis/Einh.","Gesamt"]]
        mat_rows = [mat_header]
        gesamt = 0
        for i,m in enumerate(materialien, 1):
            menge = float(m.get("menge",0) or 0)
            preis = float(m.get("preis",0) or 0)
            row_gesamt = menge * preis
            gesamt += row_gesamt
            mat_rows.append([
                p(str(i),8), p(m.get("bezeichnung","—"),8),
                p(str(m.get("menge","—")),8,align=TA_RIGHT),
                p(m.get("einheit","Stk"),8,align=TA_CENTER),
                p(f"{preis:.2f} €" if preis else "—",8,align=TA_RIGHT),
                p(f"{row_gesamt:.2f} €" if preis else "—",8,align=TA_RIGHT,bold=preis>0),
            ])
        if gesamt > 0:
            mat_rows.append([
                p(""),p(""),p(""),p(""),
                p("Materialgesamt:",8,bold=True),
                p(f"{gesamt:.2f} €",9,bold=True,color=DUNKEL),
            ])

        t_mat = Table(mat_rows, colWidths=[10*mm,88*mm,16*mm,16*mm,25*mm,25*mm])
        t_mat.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#555555")),
            ("TEXTCOLOR",(0,0),(-1,0),WEISS),
            ("ROWBACKGROUNDS",(0,1),(-1,-2),[WEISS,GRAU]),
            ("BACKGROUND",(0,-1),(-1,-1),colors.HexColor("#fef9c3")),
            ("GRID",(0,0),(-1,-1),0.3,HELLGRAU),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),4),
            ("ALIGN",(2,0),(-1,-1),"RIGHT"),
        ]))
        el.append(t_mat)
        el.append(Spacer(1, 4*mm))

    # Notizen
    if rz.notizen:
        el.append(Table([[p("Bemerkungen / Notizen", 7, bold=True, color=WEISS)]],
            colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),6)]))
        el.append(Table([[p(rz.notizen, 8)]],
            colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),GRAU),
            ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("LEFTPADDING",(0,0),(-1,-1),6)]))
        el.append(Spacer(1, 4*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # UNTERSCHRIFTEN (wie Referenz)
    # ══════════════════════════════════════════════════════════════════════════
    el.append(Table([[p("Zab- und Materialvoraussetzungen", 7, bold=True, color=WEISS)]],
        colWidths=[W], style=[("BACKGROUND",(0,0),(-1,-1),DUNKEL),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LEFTPADDING",(0,0),(-1,-1),6)]))

    def unterschrift_zelle(titel, b64_data, name, breite):
        inhalt = [p(titel, 7, color=colors.grey)]
        if b64_data:
            try:
                img_data = base64.b64decode(b64_data.split(",")[-1])
                img = RLImage(io.BytesIO(img_data), width=breite-6*mm, height=18*mm)
                inhalt.append(img)
            except:
                inhalt.append(Spacer(1, 18*mm))
        else:
            inhalt.append(Spacer(1, 18*mm))
        inhalt.append(HRFlowable(width=breite-6*mm, thickness=0.5, color=DUNKEL))
        inhalt.append(p(name or "Unterschrift, Datum", 7, color=colors.grey))
        t = Table([[x] for x in inhalt], colWidths=[breite-4*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),GRAU),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),2),
            ("LEFTPADDING",(0,0),(-1,-1),4),
        ]))
        return t

    ma_name = rz.erstellt_von.vollname if rz.erstellt_von else "Monteur"
    u_table = Table([[
        unterschrift_zelle("Monteur / Mitarbeiter", rz.unterschrift_mitarbeiter, ma_name, 87*mm),
        Spacer(6*mm, 1),
        unterschrift_zelle("Kunde / Auftraggeber", rz.unterschrift_kunde, auftrag.kunde_name, 87*mm),
    ]], colWidths=[87*mm, 6*mm, 87*mm])
    u_table.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP")]))
    el.append(u_table)
    el.append(Spacer(1, 5*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # FUSSZEILE
    # ══════════════════════════════════════════════════════════════════════════
    el.append(Table([[""]], colWidths=[W], rowHeights=[2*mm],
        style=[("BACKGROUND",(0,0),(-1,-1),GELB)]))
    el.append(Spacer(1,2*mm))
    el.append(Table([[p(
        f"Elektro Pepel GmbH  |  Auftrag {auftrag.auftragsnummer}  |  "
        f"Erstellt: {datetime.now().strftime('%d.%m.%Y %H:%M')}  |  "
        f"Aufbewahrungspflicht gemäß § 147 AO: 10 Jahre",
        6, color=colors.grey, align=TA_CENTER
    )]], colWidths=[W]))

    doc.build(el)
    return buffer.getvalue()