from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Float,
    ForeignKey, Text, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class Rolle(str, enum.Enum):
    admin        = "admin"
    vorgesetzter = "vorgesetzter"
    bauleiter    = "bauleiter"
    mitarbeiter  = "mitarbeiter"

class UrlaubStatus(str, enum.Enum):
    beantragt  = "beantragt"
    genehmigt  = "genehmigt"
    abgelehnt  = "abgelehnt"
    storniert  = "storniert"

class AbwesenheitTyp(str, enum.Enum):
    urlaub      = "urlaub"
    krank       = "krank"
    feiertag    = "feiertag"
    sonderurlaub = "sonderurlaub"

class BaustelleStatus(str, enum.Enum):
    aktiv      = "aktiv"
    abgeschlossen = "abgeschlossen"
    archiviert = "archiviert"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(255), unique=True, index=True, nullable=False)
    passwort_hash    = Column(String(255), nullable=False)
    vorname          = Column(String(100), nullable=False)
    nachname         = Column(String(100), nullable=False)
    telefon          = Column(String(30), nullable=True)
    rolle            = Column(SAEnum(Rolle), default=Rolle.mitarbeiter, nullable=False)
    aktiv            = Column(Boolean, default=True)
    urlaubstage_jahr = Column(Integer, default=30)  # Urlaubsanspruch pro Jahr
    erstellt_am      = Column(DateTime(timezone=True), server_default=func.now())
    geaendert_am     = Column(DateTime(timezone=True), onupdate=func.now())

    # Datenschutz: Löschmarkierung statt hard delete
    geloescht        = Column(Boolean, default=False)
    geloescht_am     = Column(DateTime(timezone=True), nullable=True)

    zeiteintraege    = relationship("Zeiteintrag", back_populates="user", cascade="all, delete-orphan")
    urlaubsantraege  = relationship("Urlaubsantrag", back_populates="user", cascade="all, delete-orphan")
    baustellen_rel   = relationship("BaustelleMitarbeiter", back_populates="user")
    audit_logs       = relationship("AuditLog", back_populates="user")

    @property
    def vollname(self):
        return f"{self.vorname} {self.nachname}"


# ─── Baustelle ────────────────────────────────────────────────────────────────

class Baustelle(Base):
    __tablename__ = "baustellen"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(200), nullable=False)
    status          = Column(SAEnum(BaustelleStatus), default=BaustelleStatus.aktiv)

    # Kundendaten (DSGVO-relevant: verschlüsselt gespeichert)
    kunde_name      = Column(String(200), nullable=False)
    kunde_adresse   = Column(String(500), nullable=True)
    kunde_telefon   = Column(String(50), nullable=True)
    kunde_email     = Column(String(255), nullable=True)

    baustelle_adresse = Column(String(500), nullable=True)
    auftragsnummer  = Column(String(100), nullable=True)
    beschreibung    = Column(Text, nullable=True)

    bauleiter_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    erstellt_von_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    erstellt_am     = Column(DateTime(timezone=True), server_default=func.now())
    geaendert_am    = Column(DateTime(timezone=True), onupdate=func.now())

    bauleiter       = relationship("User", foreign_keys=[bauleiter_id])
    erstellt_von    = relationship("User", foreign_keys=[erstellt_von_id])
    zeiteintraege   = relationship("Zeiteintrag", back_populates="baustelle")
    mitarbeiter_rel = relationship("BaustelleMitarbeiter", back_populates="baustelle")
    regiezettel     = relationship("Regiezettel", back_populates="baustelle")


class BaustelleMitarbeiter(Base):
    """Zuordnung Mitarbeiter ↔ Baustelle"""
    __tablename__ = "baustelle_mitarbeiter"

    id           = Column(Integer, primary_key=True)
    baustelle_id = Column(Integer, ForeignKey("baustellen.id"), nullable=False)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    zugewiesen_am = Column(DateTime(timezone=True), server_default=func.now())

    baustelle    = relationship("Baustelle", back_populates="mitarbeiter_rel")
    user         = relationship("User", back_populates="baustellen_rel")


# ─── Zeiterfassung ────────────────────────────────────────────────────────────

class Zeiteintrag(Base):
    __tablename__ = "zeiteintraege"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    baustelle_id    = Column(Integer, ForeignKey("baustellen.id"), nullable=True)

    datum           = Column(Date, nullable=False, index=True)
    beginn          = Column(DateTime(timezone=True), nullable=False)
    ende            = Column(DateTime(timezone=True), nullable=True)
    pause_minuten   = Column(Integer, default=0)  # Pause in Minuten

    # Stunden werden berechnet gespeichert für Performance
    arbeitsstunden  = Column(Float, nullable=True)
    ueberstunden    = Column(Float, default=0.0)

    taetigkeit      = Column(Text, nullable=True)   # Was wurde gemacht
    materialien     = Column(JSON, nullable=True)   # [{"bezeichnung": "Kabel", "menge": "10m"}]
    notizen         = Column(Text, nullable=True)

    # Korrekturen (Vorgesetzter/Bauleiter darf ändern)
    korrigiert      = Column(Boolean, default=False)
    korrigiert_von_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    korrigiert_am   = Column(DateTime(timezone=True), nullable=True)
    korrektur_grund = Column(Text, nullable=True)

    erstellt_am     = Column(DateTime(timezone=True), server_default=func.now())
    geaendert_am    = Column(DateTime(timezone=True), onupdate=func.now())

    user            = relationship("User", foreign_keys=[user_id], back_populates="zeiteintraege")
    baustelle       = relationship("Baustelle", back_populates="zeiteintraege")
    korrigiert_von  = relationship("User", foreign_keys=[korrigiert_von_id])


# ─── Urlaub ───────────────────────────────────────────────────────────────────

class Urlaubsantrag(Base):
    __tablename__ = "urlaubsantraege"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    typ             = Column(SAEnum(AbwesenheitTyp), default=AbwesenheitTyp.urlaub)
    status          = Column(SAEnum(UrlaubStatus), default=UrlaubStatus.beantragt)

    von_datum       = Column(Date, nullable=False)
    bis_datum       = Column(Date, nullable=False)
    arbeitstage     = Column(Integer, nullable=False)  # Berechnet, ohne Wochenenden/Feiertage
    notiz           = Column(Text, nullable=True)

    genehmigt_von_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    genehmigt_am    = Column(DateTime(timezone=True), nullable=True)
    ablehnungsgrund = Column(Text, nullable=True)

    erstellt_am     = Column(DateTime(timezone=True), server_default=func.now())

    user            = relationship("User", foreign_keys=[user_id], back_populates="urlaubsantraege")
    genehmigt_von   = relationship("User", foreign_keys=[genehmigt_von_id])


# ─── Regiezettel ──────────────────────────────────────────────────────────────

class Regiezettel(Base):
    __tablename__ = "regiezettel"

    id              = Column(Integer, primary_key=True, index=True)
    baustelle_id    = Column(Integer, ForeignKey("baustellen.id"), nullable=False)
    erstellt_von_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    datum_von       = Column(Date, nullable=False)
    datum_bis       = Column(Date, nullable=False)
    titel           = Column(String(300), nullable=True)

    # Snapshot der Daten zum Zeitpunkt der Erstellung (unveränderlich)
    daten_snapshot  = Column(JSON, nullable=False)  # Alle Zeiteinträge, Materialien etc.

    pdf_pfad        = Column(String(500), nullable=True)  # Gespeicherter PDF-Pfad
    pdf_erstellt_am = Column(DateTime(timezone=True), nullable=True)

    # Unterschriften (Base64 oder Bestätigung)
    unterschrift_bauleiter = Column(Boolean, default=False)
    unterschrift_kunde     = Column(Boolean, default=False)
    unterschrift_datum     = Column(DateTime(timezone=True), nullable=True)

    notizen         = Column(Text, nullable=True)
    erstellt_am     = Column(DateTime(timezone=True), server_default=func.now())

    baustelle       = relationship("Baustelle", back_populates="regiezettel")
    erstellt_von    = relationship("User", foreign_keys=[erstellt_von_id])


# ─── Audit Log (DSGVO) ────────────────────────────────────────────────────────

class AuditLog(Base):
    """Protokolliert alle datenschutzrelevanten Aktionen"""
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    aktion      = Column(String(100), nullable=False)  # z.B. "zeiteintrag_geaendert"
    tabelle     = Column(String(100), nullable=True)
    datensatz_id = Column(Integer, nullable=True)
    details     = Column(JSON, nullable=True)           # Was wurde geändert
    ip_adresse  = Column(String(45), nullable=True)
    erstellt_am = Column(DateTime(timezone=True), server_default=func.now())

    user        = relationship("User", back_populates="audit_logs")
