from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import User, AuditLog, Rolle

router = APIRouter()

@router.get("/audit-log")
def audit_log(
    limit: int = 100,
    current_user: User = Depends(require_role(Rolle.admin)),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.erstellt_am.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "aktion": l.aktion,
            "user": l.user.vollname if l.user else "System",
            "tabelle": l.tabelle,
            "details": l.details,
            "ip": l.ip_adresse,
            "erstellt_am": l.erstellt_am,
        }
        for l in logs
    ]

@router.get("/statistik")
def statistik(
    current_user: User = Depends(require_role(Rolle.admin, Rolle.vorgesetzter)),
    db: Session = Depends(get_db)
):
    from app.models.models import Baustelle, Zeiteintrag, Urlaubsantrag, UrlaubStatus, BaustelleStatus
    from sqlalchemy import extract, func
    from datetime import datetime
    m = datetime.now().month
    j = datetime.now().year
    return {
        "mitarbeiter_aktiv": db.query(User).filter(User.aktiv == True, User.geloescht == False).count(),
        "baustellen_aktiv": db.query(Baustelle).filter(Baustelle.status == BaustelleStatus.aktiv).count(),
        "stunden_diesen_monat": db.query(func.sum(Zeiteintrag.arbeitsstunden)).filter(
            extract("month", Zeiteintrag.datum) == m,
            extract("year", Zeiteintrag.datum) == j,
        ).scalar() or 0,
        "offene_urlaubsantraege": db.query(Urlaubsantrag).filter(Urlaubsantrag.status == "beantragt").count(),
    }
