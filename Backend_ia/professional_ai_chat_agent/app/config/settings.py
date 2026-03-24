import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Robotransit AI")
    ENV: str = os.getenv("ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "defaultsecret")
    TIMEZONE: str = os.getenv("TIMEZONE", "America/Bogota")

settings = Settings()