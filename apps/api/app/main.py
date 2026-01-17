from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.campaigns import router as campaigns_router
from app.db.session import Base, engine, ensure_data_dir


def create_app() -> FastAPI:
    ensure_data_dir()
    Base.metadata.create_all(bind=engine)

    app = FastAPI(title='AI Campaign Builder API', version='0.1.0')

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:4173',
            'http://127.0.0.1:4173',
        ],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.include_router(campaigns_router, prefix='/campaigns', tags=['campaigns'])
    return app


app = create_app()
