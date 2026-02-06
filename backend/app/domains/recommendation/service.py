import logging
import random
from typing import List, Dict, Any, Tuple

from app.ai.workflows.recommendation_workflow import get_recommendation_workflow
from app.ai.schemas.workflow_state import RecommendationState

logger = logging.getLogger(__name__)


class RecommendationService:
    """Service for outfit recommendations."""

    def __init__(self):
        self.workflow = get_recommendation_workflow()

    def calculate_outfit_score(
        self, top: Dict[str, Any], bottom: Dict[str, Any]
    ) -> Tuple[float, List[str]]:
        """
        Calculates a compatibility score for a top and bottom outfit.
        """
        score = 0.5
        reasons = []

        top_attributes = top.get("attributes", {})
        bottom_attributes = bottom.get("attributes", {})

        # 1. Formality Check
        # Safely get formality score, default to 0.5
        t_formality = (
            top_attributes.get("scores", {}).get("formality", 0.5)
            if top_attributes.get("scores")
            else 0.5
        )
        b_formality = (
            bottom_attributes.get("scores", {}).get("formality", 0.5)
            if bottom_attributes.get("scores")
            else 0.5
        )

        if t_formality is None:
            t_formality = 0.5
        if b_formality is None:
            b_formality = 0.5

        diff = abs(t_formality - b_formality)
        if diff < 0.1:
            score += 0.2
            reasons.append("Formality matches perfectly.")
        elif diff > 0.4:
            score -= 0.2
            reasons.append("Formality clash.")

        # 2. Season Match
        t_seasons_list = (
            top_attributes.get("scores", {}).get("season", [])
            if top_attributes.get("scores")
            else []
        )
        b_seasons_list = (
            bottom_attributes.get("scores", {}).get("season", [])
            if bottom_attributes.get("scores")
            else []
        )

        t_seasons = set(t_seasons_list) if isinstance(t_seasons_list, list) else set()
        b_seasons = set(b_seasons_list) if isinstance(b_seasons_list, list) else set()

        common_seasons = t_seasons.intersection(b_seasons)

        if common_seasons:
            score += 0.1
            reasons.append(f"Suitable for {', '.join(common_seasons)}.")
        elif (
            t_seasons and b_seasons
        ):  # Only penalize if seasons are actually defined and disjoint
            score -= 0.1
            reasons.append("Season mismatch.")

        # Cap score
        score = max(0.0, min(1.0, score))
        return score, reasons

    def recommend_with_llm(
        self, tops: List[Dict[str, Any]], bottoms: List[Dict[str, Any]], count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Recommend outfits using LLM-based workflow.
        """
        try:
            # Construct state
            initial_state: RecommendationState = {
                "tops": tops,
                "bottoms": bottoms,
                "candidates": [],
                "llm_recommendations": None,
                "final_outfits": [],
                "metadata": {},
                "user_request": None,
                "weather_info": None,
                "count": count,
            }

            result = self.workflow.invoke(initial_state)
            return result.get("final_outfits", [])

        except Exception as e:
            logger.error(f"LLM recommendation error: {e}")
            # Fallback
            return self._rule_based_recommendation(tops, bottoms, count)

    def _rule_based_recommendation(
        self, tops: List[Dict[str, Any]], bottoms: List[Dict[str, Any]], count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fallback rule-based recommendation.
        """
        recommendations = []

        # Copy to avoid modifying originals in place
        tops_copy = list(tops)
        bottoms_copy = list(bottoms)

        # Simple approach: shuffle and pair
        random.shuffle(tops_copy)
        random.shuffle(bottoms_copy)

        # Cross join limited to avoid explosion
        candidates = []
        limit = 5
        for top in tops_copy[:limit]:
            for bottom in bottoms_copy[:limit]:
                candidates.append({"top": top, "bottom": bottom})

        # Score candidates
        for outfit in candidates:
            score, reasons = self.calculate_outfit_score(
                outfit["top"], outfit["bottom"]
            )
            outfit["score"] = score
            outfit["reason"] = "; ".join(reasons)
            recommendations.append(outfit)

        # Sort by score desc
        recommendations.sort(key=lambda x: x.get("score", 0), reverse=True)

        return recommendations[:count]


recommender = RecommendationService()
