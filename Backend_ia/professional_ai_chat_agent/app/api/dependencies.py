from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.user_service import UserService


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(user_id: int, db: Session = Depends(get_db)):
    user_service = UserService(db)
    return user_service.get_user(user_id)