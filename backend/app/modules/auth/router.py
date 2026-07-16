from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse
from app.modules.auth.service import authenticate_user, issue_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return TokenResponse(access_token=issue_token(user))


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse(
        username=user.username,
        name=user.display_name,
        role=user.role,
        initial=user.initial,
    )
