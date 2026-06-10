from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user, require_role, hash_password
from app.models.models import User, Rolle, AuditLog

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    passwort: str
    vorname: str
    nachname: str
    telefon: Optional[str] = None
    rolle: Rolle = Rolle.mitarbeiter
    urlaubstage_jahr: int = 30

class UserOut(BaseModel):
    id: int
    email: str
    vorname: str
    nachname: str
    rolle: str
    aktiv: bool
    urlaubstage_jahr: int
    class Config:
        from_attributes = True

@router.post("/setup", response_model=UserOut)
def ersten_admin_anlegen(req: UserCreate, db: Session = Depends(get_db)):
    """Nur nutzbar wenn noch kein einziger User existiert."""
    anzahl = db.query(User).count()
    if anzahl > 0:
        raise HTTPException(status_code=403, detail="Setup bereits abgeschlossen.")
    user = User(
        email=req.email.lower(),
        passwort_hash=hash_password(req.passwort),
        vorname=req.vorname, nachname=req.nachname,
        telefon=req.telefon, rolle=Rolle.admin,
        urlaubstage_jahr=req.urlaubstage_jahr,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[UserOut])
def alle_user(
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter, Rolle.bauleiter)),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.geloescht == False, User.aktiv == True).order_by(User.nachname).all()

@router.post("/", response_model=UserOut)
def erstellen(
    req: UserCreate,
    current_user: User = Depends(require_role(Rolle.admin)),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == req.email.lower()).first():
        raise HTTPException(status_code=400, detail="E-Mail bereits vergeben")
    user = User(
        email=req.email.lower(),
        passwort_hash=hash_password(req.passwort),
        vorname=req.vorname, nachname=req.nachname,
        telefon=req.telefon, rolle=req.rolle,
        urlaubstage_jahr=req.urlaubstage_jahr,
    )
    db.add(user)
    log = AuditLog(user_id=current_user.id, aktion="user_erstellt", details={"email": req.email, "rolle": req.rolle})
    db.add(log)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def loeschen(
    user_id: int,
    current_user: User = Depends(require_role(Rolle.admin)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Eigenen Account nicht löschbar")
    user.geloescht = True
    user.geloescht_am = datetime.now(timezone.utc)
    user.aktiv = False
    user.vorname = "Gelöscht"
    user.nachname = f"#{user.id}"
    user.email = f"geloescht_{user.id}@deleted.local"
    user.telefon = None
    log = AuditLog(user_id=current_user.id, aktion="user_geloescht_dsgvo", details={"user_id": user_id})
    db.add(log)
    db.commit()
    return {"message": "Benutzer DSGVO-konform gelöscht und anonymisiert"}
