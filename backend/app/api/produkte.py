from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.core.database import get_db, Base
from app.core.security import get_current_user, require_role
from app.models.models import User, Rolle
from typing import Optional
from pydantic import BaseModel
import enum

router = APIRouter()

# ── Inline Models (keine separate Datei nötig) ────────────────────────────────

class ProduktKat(str, enum.Enum):
    material    = "material"
    arbeitszeit = "arbeitszeit"
    anfahrt     = "anfahrt"
    pauschale   = "pauschale"
    sonstiges   = "sonstiges"

class Produkt(Base):
    __tablename__ = "produkte"
    __table_args__ = {"extend_existing": True}
    id            = Column(Integer, primary_key=True, index=True)
    artikelnummer = Column(String(100), nullable=True)
    bezeichnung   = Column(String(300), nullable=False)
    beschreibung  = Column(Text, nullable=True)
    kategorie     = Column(String(50), default="material")
    einheit       = Column(String(20), default="Stk")
    preis         = Column(Float, nullable=False, default=0.0)
    aktiv         = Column(Boolean, default=True)
    erstellt_am   = Column(DateTime(timezone=True), server_default=func.now())

class Arbeitszeitpreis(Base):
    __tablename__ = "arbeitszeitpreise"
    __table_args__ = {"extend_existing": True}
    id           = Column(Integer, primary_key=True)
    rolle        = Column(String(50), nullable=False, unique=True)
    bezeichnung  = Column(String(100), nullable=False)
    preis_stunde = Column(Float, nullable=False, default=0.0)
    aktiv        = Column(Boolean, default=True)

class Anfahrtspauschale(Base):
    __tablename__ = "anfahrtspauschalen"
    __table_args__ = {"extend_existing": True}
    id           = Column(Integer, primary_key=True)
    bezeichnung  = Column(String(200), nullable=False)
    preis        = Column(Float, nullable=False, default=0.0)
    beschreibung = Column(Text, nullable=True)
    aktiv        = Column(Boolean, default=True)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProduktCreate(BaseModel):
    artikelnummer: Optional[str] = None
    bezeichnung: str
    beschreibung: Optional[str] = None
    kategorie: str = "material"
    einheit: str = "Stk"
    preis: float = 0.0

class AzCreate(BaseModel):
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
    query = db.query(Produkt).filter(Produkt.aktiv == True)
    if suche:
        query = query.filter(
            Produkt.bezeichnung.ilike(f"%{suche}%") |
            Produkt.artikelnummer.ilike(f"%{suche}%")
        )
    if kategorie:
        query = query.filter(Produkt.kategorie == kategorie)
    return [{"id":p.id,"artikelnummer":p.artikelnummer,"bezeichnung":p.bezeichnung,
             "beschreibung":p.beschreibung,"kategorie":p.kategorie,
             "einheit":p.einheit,"preis":p.preis} for p in query.order_by(Produkt.bezeichnung).limit(50).all()]

@router.post("/produkte")
def produkt_erstellen(req: ProduktCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    p = Produkt(**req.dict())
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id, "message": "Produkt erstellt"}

@router.put("/produkte/{pid}")
def produkt_bearbeiten(pid: int, req: ProduktCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    p = db.query(Produkt).filter(Produkt.id == pid).first()
    if not p: raise HTTPException(status_code=404)
    for k,v in req.dict().items(): setattr(p,k,v)
    db.commit()
    return {"message": "Gespeichert"}

@router.delete("/produkte/{pid}")
def produkt_loeschen(pid: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    p = db.query(Produkt).filter(Produkt.id == pid).first()
    if not p: raise HTTPException(status_code=404)
    p.aktiv = False; db.commit()
    return {"message": "Gelöscht"}


# ── Arbeitszeitpreise ─────────────────────────────────────────────────────────

@router.get("/arbeitszeitpreise")
def az_liste(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id":x.id,"rolle":x.rolle,"bezeichnung":x.bezeichnung,"preis_stunde":x.preis_stunde}
            for x in db.query(Arbeitszeitpreis).filter_by(aktiv=True).all()]

@router.post("/arbeitszeitpreise")
def az_erstellen(req: AzCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    ex = db.query(Arbeitszeitpreis).filter_by(rolle=req.rolle).first()
    if ex:
        ex.bezeichnung = req.bezeichnung; ex.preis_stunde = req.preis_stunde
        db.commit(); return {"message": "Aktualisiert"}
    db.add(Arbeitszeitpreis(**req.dict())); db.commit()
    return {"message": "Erstellt"}

@router.put("/arbeitszeitpreise/{aid}")
def az_bearbeiten(aid: int, req: AzCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    x = db.query(Arbeitszeitpreis).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    for k,v in req.dict().items(): setattr(x,k,v)
    db.commit(); return {"message": "Gespeichert"}


# ── Anfahrtspauschalen ────────────────────────────────────────────────────────

@router.get("/anfahrt")
def anfahrt_liste(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id":x.id,"bezeichnung":x.bezeichnung,"preis":x.preis,"beschreibung":x.beschreibung}
            for x in db.query(Anfahrtspauschale).filter_by(aktiv=True).all()]

@router.post("/anfahrt")
def anfahrt_erstellen(req: AnfahrtCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    db.add(Anfahrtspauschale(**req.dict())); db.commit()
    return {"message": "Erstellt"}

@router.put("/anfahrt/{aid}")
def anfahrt_bearbeiten(aid: int, req: AnfahrtCreate,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    x = db.query(Anfahrtspauschale).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    for k,v in req.dict().items(): setattr(x,k,v)
    db.commit(); return {"message": "Gespeichert"}

@router.delete("/anfahrt/{aid}")
def anfahrt_loeschen(aid: int,
    current_user: User = Depends(require_role(Rolle.admin, Rolle.verwaltung)),
    db: Session = Depends(get_db)):
    x = db.query(Anfahrtspauschale).filter_by(id=aid).first()
    if not x: raise HTTPException(status_code=404)
    x.aktiv = False; db.commit()
    return {"message": "Gelöscht"}