from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.models import User


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username.strip()).first()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def issue_token(user: User) -> str:
    return create_access_token(
        subject=user.username,
        extra={"role": user.role, "name": user.display_name},
    )
