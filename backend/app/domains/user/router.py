import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.domains.user.model import User
from app.domains.user.schema import UserUpdate, UserResponse
from app.domains.user.service import user_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="내 정보 조회",
    description="현재 로그인한 사용자의 정보를 조회합니다.",
)
def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Use user_manager to get profile with signed URL
    profile = user_manager.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="회원정보 수정",
    description="로그인한 사용자의 프로필(키, 몸무게, 성별, 체형)을 수정합니다.",
)
def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return user_manager.update_profile(db, current_user.id, update_data)
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.post(
    "/profile/image",
    response_model=UserResponse,
    summary="사용자 얼굴 사진 업로드",
    description="사용자 얼굴 사진을 업로드하여 AI 코디 생성 시 활용합니다.",
)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        await user_manager.upload_face_image(db, current_user.id, file)
        # Return updated profile with new image URL
        return user_manager.get_user_profile(db, current_user.id)
    except Exception as e:
        logger.error(f"Error uploading profile image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
