from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import (
    User, Rolle, AuditLog,
    Auftrag, AuftragZuweisung, AuftragRegiezettel,
    AuftragTyp, AuftragStatus
)

router = APIRouter()


class AuftragCreate(BaseModel):
    titel: str
    typ: str = "kundendienst"
    beschreibung: Optional[str] = None
    kunde_name: str
    kunde_adresse: Optional[str] = None
    kunde_telefon: Optional[str] = None
    kunde_email: Optional[str] = None
    kunde_notiz: Optional[str] = None
    termin_datum: Optional[str] = None
    termin_von: Optional[str] = None
    termin_bis: Optional[str] = None
    baustelle_id: Optional[int] = None
    mitarbeiter_ids: Optional[List[int]] = []


class RegiezettelCreate(BaseModel):
    datum: str
    beginn_uhr: Optional[str] = None
    ende_uhr: Optional[str] = None
    arbeitsstunden: Optional[float] = None
    pause_minuten: int = 0
    mitarbeiter_namen: Optional[list] = []
    materialien: Optional[list] = []
    taetigkeit: Optional[str] = None
    notizen: Optional[str] = None
    unterschrift_mitarbeiter: Optional[str] = None
    unterschrift_kunde: Optional[str] = None
    kunde_anwesend: bool = False


def naechste_nummer(db: Session) -> str:
    heute = datetime.now()
    prefix = f"A-{heute.year}-"
    letzter = db.query(Auftrag).filter(
        Auftrag.auftragsnummer.like(f"{prefix}%")
    ).order_by(Auftrag.id.desc()).first()
    nr = 1
    if letzter:
        try:
            nr = int(letzter.auftragsnummer.split("-")[-1]) + 1
        except:
            nr = 1
    return f"{prefix}{str(nr).zfill(4)}"


@router.post("/")
def erstellen(
    req: AuftragCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    auftrag = Auftrag(
        auftragsnummer=naechste_nummer(db),
        titel=req.titel,
        typ=req.typ,
        beschreibung=req.beschreibung,
        kunde_name=req.kunde_name,
        kunde_adresse=req.kunde_adresse,
        kunde_telefon=req.kunde_telefon,
        kunde_email=req.kunde_email,
        kunde_notiz=req.kunde_notiz,
        termin_datum=date.fromisoformat(req.termin_datum) if req.termin_datum else None,
        termin_von=req.termin_von,
        termin_bis=req.termin_bis,
        baustelle_id=req.baustelle_id,
        erstellt_von_id=current_user.id,
    )
    db.add(auftrag)
    db.flush()
    for uid in (req.mitarbeiter_ids or []):
        db.add(AuftragZuweisung(auftrag_id=auftrag.id, user_id=uid))
    db.commit()
    db.refresh(auftrag)
    return {"id": auftrag.id, "auftragsnummer": auftrag.auftragsnummer, "message": "Auftrag erstellt"}


@router.get("/")
def liste(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Auftrag)
    if current_user.rolle == Rolle.mitarbeiter:
        ids = db.query(AuftragZuweisung.auftrag_id).filter(
            AuftragZuweisung.user_id == current_user.id
        ).subquery()
        query = query.filter(Auftrag.id.in_(ids))
    if status:
        query = query.filter(Auftrag.status == status)
    auftraege = query.order_by(Auftrag.termin_datum.asc().nullslast(), Auftrag.erstellt_am.desc()).all()
    result = []
    for a in auftraege:
        result.append({
            "id": a.id,
            "auftragsnummer": a.auftragsnummer,
            "titel": a.titel,
            "typ": a.typ,
            "status": a.status,
            "kunde_name": a.kunde_name,
            "kunde_adresse": a.kunde_adresse,
            "kunde_telefon": a.kunde_telefon,
            "termin_datum": str(a.termin_datum) if a.termin_datum else None,
            "termin_von": a.termin_von,
            "termin_bis": a.termin_bis,
            "mitarbeiter": [z.user.vollname for z in a.zuweisungen if z.user],
            "regiezettel_count": len(a.regiezettel_auftraege),
            "regiezettel": [{
                "id": r.id,
                "datum": str(r.datum),
                "arbeitsstunden": r.arbeitsstunden,
                "taetigkeit": r.taetigkeit,
                "unterschrift_mitarbeiter": bool(r.unterschrift_mitarbeiter),
                "unterschrift_kunde": bool(r.unterschrift_kunde),
                "pdf_erstellt_am": str(r.pdf_erstellt_am) if r.pdf_erstellt_am else None,
            } for r in a.regiezettel_auftraege],
        })
    return result


@router.get("/heute")
def heute(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ids = db.query(AuftragZuweisung.auftrag_id).filter(AuftragZuweisung.user_id == current_user.id).subquery()
    auftraege = db.query(Auftrag).filter(
        Auftrag.id.in_(ids),
        Auftrag.termin_datum == date.today(),
        Auftrag.status.in_(["offen","in_bearbeitung"]),
    ).all()
    return [{"id":a.id,"auftragsnummer":a.auftragsnummer,"titel":a.titel,"typ":a.typ,
             "status":a.status,"termin_von":a.termin_von,"termin_bis":a.termin_bis,
             "kunde_name":a.kunde_name,"kunde_adresse":a.kunde_adresse} for a in auftraege]


@router.get("/{auftrag_id}")
def detail(auftrag_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(Auftrag).filter(Auftrag.id == auftrag_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return {
        "id": a.id, "auftragsnummer": a.auftragsnummer, "titel": a.titel,
        "typ": a.typ, "status": a.status, "beschreibung": a.beschreibung,
        "kunde_name": a.kunde_name, "kunde_adresse": a.kunde_adresse,
        "kunde_telefon": a.kunde_telefon, "kunde_email": a.kunde_email,
        "kunde_notiz": a.kunde_notiz,
        "termin_datum": str(a.termin_datum) if a.termin_datum else None,
        "termin_von": a.termin_von, "termin_bis": a.termin_bis,
        "mitarbeiter": [{"id": z.user.id, "name": z.user.vollname} for z in a.zuweisungen if z.user],
        "regiezettel": [{
            "id": r.id, "datum": str(r.datum),
            "arbeitsstunden": r.arbeitsstunden, "taetigkeit": r.taetigkeit,
            "unterschrift_mitarbeiter": bool(r.unterschrift_mitarbeiter),
            "unterschrift_kunde": bool(r.unterschrift_kunde),
            "pdf_erstellt_am": str(r.pdf_erstellt_am) if r.pdf_erstellt_am else None,
        } for r in a.regiezettel_auftraege],
    }


@router.put("/{auftrag_id}/status")
def status_aendern(auftrag_id: int, neuer_status: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(Auftrag).filter(Auftrag.id == auftrag_id).first()
    if not a: raise HTTPException(status_code=404)
    a.status = neuer_status
    db.commit()
    return {"message": "OK"}


@router.post("/{auftrag_id}/mitarbeiter/{user_id}")
def mitarbeiter_zuweisen(
    auftrag_id: int, user_id: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    if db.query(AuftragZuweisung).filter_by(auftrag_id=auftrag_id, user_id=user_id).first():
        raise HTTPException(status_code=400, detail="Bereits zugewiesen")
    db.add(AuftragZuweisung(auftrag_id=auftrag_id, user_id=user_id))
    db.commit()
    return {"message": "OK"}


@router.post("/{auftrag_id}/regiezettel")
def regiezettel_erstellen(
    auftrag_id: int, req: RegiezettelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    a = db.query(Auftrag).filter(Auftrag.id == auftrag_id).first()
    if not a: raise HTTPException(status_code=404)
    stunden = req.arbeitsstunden
    if not stunden and req.beginn_uhr and req.ende_uhr:
        bh,bm = map(int, req.beginn_uhr.split(":"))
        eh,em = map(int, req.ende_uhr.split(":"))
        stunden = max(0, round(((eh*60+em)-(bh*60+bm)-req.pause_minuten)/60, 2))
    rz = AuftragRegiezettel(
        auftrag_id=auftrag_id, erstellt_von_id=current_user.id,
        datum=date.fromisoformat(req.datum),
        beginn_uhr=req.beginn_uhr, ende_uhr=req.ende_uhr,
        arbeitsstunden=stunden, pause_minuten=req.pause_minuten,
        mitarbeiter_namen=req.mitarbeiter_namen, materialien=req.materialien,
        taetigkeit=req.taetigkeit, notizen=req.notizen,
        unterschrift_mitarbeiter=req.unterschrift_mitarbeiter,
        unterschrift_kunde=req.unterschrift_kunde,
        unterschrift_datum=datetime.now(timezone.utc) if (req.unterschrift_mitarbeiter or req.unterschrift_kunde) else None,
        kunde_anwesend=req.kunde_anwesend,
    )
    db.add(rz)
    if req.unterschrift_mitarbeiter and req.unterschrift_kunde:
        a.status = "abgeschlossen"
    db.commit()
    db.refresh(rz)
    return {"id": rz.id, "message": "Regiezettel gespeichert"}


@router.get("/{auftrag_id}/regiezettel/{rz_id}/pdf")
def regiezettel_pdf(
    auftrag_id: int, rz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    a = db.query(Auftrag).filter(Auftrag.id == auftrag_id).first()
    rz = db.query(AuftragRegiezettel).filter(AuftragRegiezettel.id == rz_id).first()
    if not a or not rz: raise HTTPException(status_code=404)
    from app.services.auftrag_pdf import erstelle_auftrag_pdf
    pdf_bytes = erstelle_auftrag_pdf(a, rz)
    rz.pdf_erstellt_am = datetime.now(timezone.utc)
    db.commit()
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Regiezettel_{a.auftragsnummer}_{rz.datum}.pdf"'}
    )