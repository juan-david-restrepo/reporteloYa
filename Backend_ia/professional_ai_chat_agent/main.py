from dotenv import load_dotenv
import os

# 🔹 Carga el .env al inicio
load_dotenv()

from fastapi import FastAPI
from app.api import ai
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.config.settings import settings

# 1️⃣ Primero creas la app
app = FastAPI(title=settings.APP_NAME)

app.include_router(ai.router, prefix="/ai", tags=["AI"])

# 2️⃣ Luego agregas CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # permite cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3️⃣ Incluyes las rutas
app.include_router(router)

# 4️⃣ Ruta raíz
@app.get("/")
def root():
    return {"message": "Robotransit AI está funcionando correctamente"}