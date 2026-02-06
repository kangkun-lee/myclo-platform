from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.domains.user.schema import UserCreate
from app.domains.user.model import User
from .schema import UserLogin
from app.core.security import hash_password, verify_password, create_access_token


def register_user(db: Session, user_data: UserCreate):
    # Check if user exists
    existing_user = db.query(User).filter(User.user_name == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create new user
    hashed_pwd = hash_password(user_data.password)
    db_user = User(
        user_name=user_data.username,
        password=hashed_pwd,
        age=user_data.age,
        gender=user_data.gender,
        height=user_data.height,
        weight=user_data.weight,
        body_shape=user_data.body_shape,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate token
    access_token = create_access_token(
        data={
            "sub": db_user.user_name,
            "user_id": str(db_user.id),
        }
    )

    return {"success": True, "token": access_token, "user": db_user}


def authenticate_user(db: Session, user_data: UserLogin):
    user = db.query(User).filter(User.user_name == user_data.username).first()
    if not user:
        return None
    if not verify_password(user_data.password, user.password):
        return None

    # Generate token
    access_token = create_access_token(
        data={
            "sub": user.user_name,
            "user_id": str(user.id),
        }
    )

    return {"success": True, "token": access_token, "user": user}
