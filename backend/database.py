import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Lit l'URL de base de données depuis l'environnement (ex: PostgreSQL en production, SQLite par défaut)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mailalert.db")

# Normalisation des URL PostgreSQL (ex: postgres:// -> postgresql://)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Créer le dossier parent si nécessaire (ex: /data/mailalert.db)
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    if "/" in db_path or "\\" in db_path:
        parent_dir = os.path.dirname(db_path)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Paramètres de production pour PostgreSQL
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
