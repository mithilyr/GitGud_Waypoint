from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, demo, dispatch, driver, health, loader, reference, store

app = FastAPI(title="Waypoint Delivery API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(reference.router)
for r in (auth, demo, dispatch, driver, loader, store):
    app.include_router(r.router)
