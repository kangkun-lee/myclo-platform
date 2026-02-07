"""Chat intent analysis and chat workflow nodes."""

import logging
from typing import Dict, Any, List, Any as AnyType, cast
from langgraph.graph import StateGraph, END

from app.ai.schemas.workflow_state import ChatState
from app.ai.clients.gemini_client import gemini_client
from app.utils.json_parser import parse_json_from_text
from app.llm.todays_pick_service import recommend_todays_pick_v2
from app.domains.weather.service import weather_service

logger = logging.getLogger(__name__)


def _format_recent_history(messages: List[Dict[str, Any]], limit: int = 8) -> str:
    if not messages:
        return "(no prior conversation)"

    lines: List[str] = []
    for msg in messages[-limit:]:
        role = str(msg.get("role") or msg.get("sender") or "user").lower()
        content = str(msg.get("content") or msg.get("text") or "").strip()
        if not content:
            continue
        speaker = "User" if role in {"user", "human"} else "Assistant"
        lines.append(f"{speaker}: {content}")

    return "\n".join(lines) if lines else "(no prior conversation)"


def chat_intent_node(state: ChatState) -> ChatState:
    """Analyze whether user asks for recommendation or general chat."""
    user_query = state.get("user_query", "")
    history_text = _format_recent_history(state.get("messages", []), limit=6)

    prompt = f"""
You are a fashion assistant intent classifier.
Decide whether the latest user message is a recommendation request or general chat.
Use recent conversation context when helpful.

Recent context:
{history_text}

Latest user message: "{user_query}"

Return only JSON in this schema:
{{
  "intent": "RECOMMEND" or "GENERAL",
  "reason": "short reason",
  "tpo_context": "optional TPO context or null",
  "weather_wanted": true/false,
  "special_request": "optional detailed request or null"
}}
"""

    try:
        response_text = gemini_client.generate_content(
            prompt, temperature=0, max_output_tokens=800
        )
        parsed, _ = parse_json_from_text(response_text)

        if parsed:
            state["context"]["intent"] = parsed.get("intent", "GENERAL")
            state["context"]["tpo"] = parsed.get("tpo_context")
            state["context"]["special_request"] = parsed.get("special_request")
            state["context"]["is_recommendation_request"] = (
                parsed.get("intent") == "RECOMMEND"
            )
        else:
            state["context"]["intent"] = "GENERAL"

    except Exception as e:
        logger.error(f"Chat intent analysis error: {e}")
        state["context"]["intent"] = "GENERAL"

    return state


def generate_chat_response_node(state: ChatState) -> ChatState:
    """Generate general chat response."""
    user_query = state.get("user_query", "")
    messages = state.get("messages", [])

    system_prompt = (
        "You are MyClo, a practical fashion AI assistant. "
        "Keep replies concise, helpful, and context-aware."
    )

    history_text = _format_recent_history(messages, limit=8)
    prompt = (
        f"{system_prompt}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"User: {user_query}\n"
        "Assistant:"
    )

    try:
        response = gemini_client.generate_content(
            prompt, temperature=0.7, max_output_tokens=800
        )
        state["response"] = response
    except Exception:
        state["response"] = "二꾩넚?⑸땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"

    return state


async def handle_recommendation_node(state: ChatState) -> ChatState:
    """Call recommendation flow when intent is recommendation."""
    from uuid import UUID

    user_id = state["context"].get("user_id")
    tpo = state["context"].get("tpo")
    special_request = state["context"].get("special_request")

    if not user_id:
        state["response"] = "濡쒓렇?몄씠 ?꾩슂?⑸땲?? 癒쇱? 濡쒓렇?명빐 二쇱꽭??"
        return state

    lat = state["context"].get("lat", 37.5665)
    lon = state["context"].get("lon", 126.9780)

    context_parts = []
    if tpo:
        context_parts.append(f"TPO: {tpo}")
    if special_request:
        context_parts.append(f"?붿껌?ы빆: {special_request}")
    context = ", ".join(context_parts) if context_parts else None

    try:
        weather_data = await weather_service.get_weather_info(None, lat, lon)

        user_uuid = cast(UUID, UUID(str(user_id)))
        result = await recommend_todays_pick_v2(
            user_id=user_uuid,
            weather=weather_data,
            db=None,
            context=context,
        )

        if result.get("success"):
            state["todays_pick"] = result
            state["context"]["is_pick_updated"] = True

            weather_summary = result.get("weather_summary", "?좎뵪 ?뺣낫 ?놁쓬")
            reasoning = result.get("reasoning", "肄붾뵒瑜?異붿쿇???쒕졇?듬땲??")

            response_parts = []
            if tpo:
                response_parts.append(f"?ㅻ뒛 {tpo} ?쇱젙???덉쑝?쒓뎔??")
            response_parts.append(
                f"?꾩옱 ?좎뵪({weather_summary})? ?붿껌?ы빆??諛섏쁺???ㅻ뒛??異붿쿇??以鍮꾪뻽?듬땲??"
            )
            response_parts.append(f"\n異붿쿇 ?댁쑀: {reasoning}")
            response_parts.append("\n?붾㈃?먯꽌 異붿쿇 肄붾뵒瑜?諛붾줈 ?뺤씤??蹂댁꽭??")
            state["response"] = "\n".join(response_parts)
        else:
            state["response"] = "?꾩옱 ?룹옣 ?뺣낫濡쒕뒗 異붿쿇??留뚮뱾湲??대젮?뚯슂."

    except ValueError as ve:
        logger.warning(f"Recommendation validation error: {ve}")
        if "Insufficient wardrobe items" in str(ve):
            state["response"] = "異붿쿇???꾪빐 ?곸쓽? ?섏쓽瑜?媛곴컖 1媛??댁긽 ?깅줉??二쇱꽭??"
        else:
            state["response"] = "異붿쿇 ?앹꽦 以??낅젰媛?寃利??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."
    except Exception as e:
        logger.error(f"Error in handle_recommendation_node: {e}", exc_info=True)
        state["response"] = "肄붾뵒 異붿쿇 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"

    return state


def route_intent(state: ChatState) -> str:
    if state["context"].get("intent") == "RECOMMEND":
        return "recommend"
    return "general"


def create_chat_workflow() -> AnyType:
    workflow: AnyType = StateGraph(ChatState)

    workflow.add_node("analyze_intent", chat_intent_node)
    workflow.add_node("generate_general", generate_chat_response_node)
    workflow.add_node("recommend_outfit", handle_recommendation_node)

    # Keep existing generation node flow
    from app.ai.nodes.generation_nodes import generate_todays_pick

    workflow.add_node("generate_todays_pick", generate_todays_pick)

    workflow.set_entry_point("analyze_intent")

    workflow.add_conditional_edges(
        "analyze_intent",
        route_intent,
        {"recommend": "recommend_outfit", "general": "generate_general"},
    )

    workflow.add_edge("generate_general", END)
    workflow.add_edge("recommend_outfit", "generate_todays_pick")
    workflow.add_edge("generate_todays_pick", END)

    return cast(AnyType, workflow.compile())


_chat_workflow = None


def get_chat_workflow() -> AnyType:
    global _chat_workflow
    if _chat_workflow is None:
        _chat_workflow = create_chat_workflow()
    return _chat_workflow
