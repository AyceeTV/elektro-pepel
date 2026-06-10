from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.models.models import User, AuditLog
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    rolle: str
    vorname: str
    user_id: int

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == form_data.username.lower(),
        User.aktiv == True,
        User.geloescht == False
    ).first()

    if not user or not verify_password(form_data.password, user.passwort_hash):
        # Audit-Log: fehlgeschlagener Login
        log = AuditLog(aktion="login_fehlgeschlagen", details={"email": form_data.username}, ip_adresse=request.client.host)
        db.add(log)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-Mail oder Passwort falsch")

    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    log = AuditLog(user_id=user.id, aktion="login_erfolgreich", ip_adresse=request.client.host)
    db.add(log)
    db.commit()

    return Token(access_token=token, token_type="bearer", rolle=user.rolle, vorname=user.vorname, user_id=user.id)

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log = AuditLog(user_id=current_user.id, aktion="logout", ip_adresse=request.client.host)
    db.add(log)
    db.commit()
    return {"message": "Erfolgreich abgemeldet"}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "vorname": current_user.vorname,
        "nachname": current_user.nachname,
        "rolle": current_user.rolle,
        "urlaubstage_jahr": current_user.urlaubstage_jahr,
    }
