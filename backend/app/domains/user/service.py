from .schema import UserUpdate
from uuid import UUID
from app.storage.memory_store import update_user_profile


def update_user_profile_in_memory(user_id: UUID, update_data: UserUpdate):
    return update_user_profile(
        user_id=user_id,
        height=update_data.height,
        weight=update_data.weight,
        gender=update_data.gender,
        body_shape=update_data.body_shape,
    )
