from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / 'data'
DB_PATH = DATA_DIR / 'campaigns.db'


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


engine = create_engine(
    f'sqlite:///{DB_PATH}',
    connect_args={'check_same_thread': False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
