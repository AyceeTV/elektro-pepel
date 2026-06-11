from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import User, Rolle

router = APIRouter()

def get_models():
    from app.models.produkte import Produkt, Arbeitszeitpreis, Anfahrtspauschale, ProduktKategorie
    return Produkt, Arbeitszeitpreis, Anfahrtspauschale, ProduktKategorie


class ProduktCreate(BaseModel):
    artikelnummer: Optional[str] = None
    bezeichnung: str
    beschreibung: Optional[str] = None
    kategorie: str = "material"
    einheit: str = "Stk"
    preis: float = 0.0

class ArbeitszeitpreisCreate(BaseModel):
    rolle: str
    bezeichnung: str
    preis_stunde: float

class AnfahrtCreate(BaseModel):
    bezeichnung: str
    preis: float
    beschreibung: Optional[str] = None


# ── Produkte ──────────────────────────────────────────────────────────────────

@router.get("/produkte")
def produkte_liste(
    suche: Optional[str] = None,
    kategorie: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    Produkt, *_ = get_models()
    query = db.query(Produkt).filter(Produkt.aktiv == True)
    if suche:
        query = query.filter(
            Produkt.bezeichnung.ilike(f"%{suche}%") |
            Produkt.artikelnummer.ilike(f"%{suche}%") |
            Produkt.beschreibung.ilike(f"%{suche}%")
        )
    if kategorie:
        query = query.filter(Produkt.kategorie == kategorie)
    produkte = query.order_by(Produkt.bezeichnung).limit(50).all()
    return [{
        "id": p.id, "artikelnummer": p.artikelnummer, "bezeichnung": p.bezeichnung,
        "beschreibung": p.beschreibung, "kategorie": p.kategorie,
        "einheit": p.einheit, "preis": p.preis,
    } for p in produkte]


@router.post("/produkte")
def produkt_erstellen(
    req: ProduktCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    Produkt, *_ = get_models()
    p = Produkt(**req.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "message": "Produkt erstellt"}


@router.put("/produkte/{pid}")
def produkt_bearbeiten(
    pid: int, req: ProduktCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    Produkt, *_ = get_models()
    p = db.query(Produkt).filter(Produkt.id == pid).first()
    if not p: raise HTTPException(status_code=404)
    for k, v in req.dict().items():
        setattr(p, k, v)
    db.commit()
    return {"message": "Gespeichert"}


@router.delete("/produkte/{pid}")
def produkt_loeschen(
    pid: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    Produkt, *_ = get_models()
    p = db.query(Produkt).filter(Produkt.id == pid).first()
    if not p: raise HTTPException(status_code=404)
    p.aktiv = False
    db.commit()
    return {"message": "Gelöscht"}


# ── Arbeitszeitpreise ─────────────────────────────────────────────────────────

@router.get("/arbeitszeitpreise")
def az_liste(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _, Arbeitszeitpreis, *_ = get_models()
    return [{"id":x.id,"rolle":x.rolle,"bezeichnung":x.bezeichnung,"preis_stunde":x.preis_stunde}
            for x in db.query(Arbeitszeitpreis).filter_by(aktiv=True).all()]


@router.post("/arbeitszeitpreise")
def az_erstellen(
    req: ArbeitszeitpreisCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    _, Arbeitszeitpreis, *_ = get_models()
    existing = db.query(Arbeitszeitpreis).filter_by(rolle=req.rolle).first()
    if existing:
        existing.bezeichnung = req.bezeichnung
        existing.preis_stunde = req.preis_stunde
        db.commit()
        return {"message": "Aktualisiert"}
    db.add(Arbeitszeitpreis(**req.dict()))
    db.commit()
    return {"message": "Erstellt"}


@router.put("/arbeitszeitpreise/{aid}")
def az_bearbeiten(
    aid: int, req: ArbeitszeitpreisCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    _, Arbeitszeitpreis, *_ = get_models()
    x = db.query(Arbeitszeitpreis).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    for k,v in req.dict().items(): setattr(x,k,v)
    db.commit()
    return {"message": "Gespeichert"}


# ── Anfahrtspauschalen ────────────────────────────────────────────────────────

@router.get("/anfahrt")
def anfahrt_liste(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _, _, Anfahrtspauschale, *_ = get_models()
    return [{"id":x.id,"bezeichnung":x.bezeichnung,"preis":x.preis,"beschreibung":x.beschreibung}
            for x in db.query(Anfahrtspauschale).filter_by(aktiv=True).all()]


@router.post("/anfahrt")
def anfahrt_erstellen(
    req: AnfahrtCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    _, _, Anfahrtspauschale, *_ = get_models()
    db.add(Anfahrtspauschale(**req.dict()))
    db.commit()
    return {"message": "Erstellt"}


@router.put("/anfahrt/{aid}")
def anfahrt_bearbeiten(
    aid: int, req: AnfahrtCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    _, _, Anfahrtspauschale, *_ = get_models()
    x = db.query(Anfahrtspauschale).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    for k,v in req.dict().items(): setattr(x,k,v)
    db.commit()
    return {"message": "Gespeichert"}


@router.delete("/anfahrt/{aid}")
def anfahrt_loeschen(
    aid: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)
):
    _, _, Anfahrtspauschale, *_ = get_models()
    x = db.query(Anfahrtspauschale).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    x.aktiv = False
    db.commit()
    return {"message": "Gelöscht"}