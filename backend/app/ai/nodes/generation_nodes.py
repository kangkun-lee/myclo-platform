import logging
from typing import Optional

from app.ai.schemas.workflow_state import ChatState

logger = logging.getLogger(__name__)


def generate_todays_pick(state: ChatState) -> ChatState:
    """Skip image generation (no Blob/DB)."""
    try:
        recommendations = state.get("recommendations")
        if not recommendations:
            return state

        best_outfit = recommendations[0]
        state["todays_pick"] = {
            "id": "in-memory",
            "image_url": None,
            "items": best_outfit,
        }
        state["context"]["is_pick_updated"] = True
    except Exception as e:
        logger.error(f"Error in generate_todays_pick node: {e}")

    return state


def generate_todays_pick_composite(*args, **kwargs) -> Optional[str]:
    """Legacy stub for compatibility. Returns None without Blob storage."""
    return None
