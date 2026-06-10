from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Datenbank (PostgreSQL auf Hetzner Deutschland)
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/elektro_zeiterfassung"

    # Sicherheit
    SECRET_KEY: str = "BITTE-AENDERN-LANGER-ZUFALLSSTRING"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 Stunden (eine Schicht)

    # Firma
    FIRMA_NAME: str = "Elektro Pepel"
    FIRMA_ADRESSE: str = "Musterstraße 1, 12345 Musterstadt"

    # E-Mail (für Regiezettel-Versand)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # DSGVO
    DATEN_AUFBEWAHRUNG_JAHRE: int = 10  # gesetzliche Aufbewahrungspflicht

    class Config:
        env_file = ".env"

settings = Settings()
