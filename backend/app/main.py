from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
 
from app.core.database import engine, Base
from app.api import auth, users, zeiterfassung, baustellen, urlaub, regiezettel, admin
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
 
app = FastAPI(
    title="Elektro Pepel – Zeiterfassung API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)
 
# CORS — alle Vercel-Subdomains erlauben
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Für Produktion später auf Vercel-URL einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(users.router,         prefix="/api/users",         tags=["Benutzer"])
app.include_router(zeiterfassung.router, prefix="/api/zeiterfassung", tags=["Zeiterfassung"])
app.include_router(baustellen.router,    prefix="/api/baustellen",    tags=["Baustellen"])
app.include_router(urlaub.router,        prefix="/api/urlaub",        tags=["Urlaub"])
app.include_router(regiezettel.router,   prefix="/api/regiezettel",   tags=["Regiezettel"])
app.include_router(admin.router,         prefix="/api/admin",         tags=["Admin"])
 
@app.get("/api/health")
def health():
    return {"status": "ok"}
