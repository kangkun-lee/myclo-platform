"""
이미지 속성 추출 LangGraph 노드
"""
import copy
import logging
from typing import Dict, Any, cast
from app.ai.schemas.workflow_state import ExtractionState
from app.ai.clients.gemini_client import gemini_client
from app.ai.prompts.extraction_prompts import USER_PROMPT, DEFAULT_OBJ, build_retry_prompt
from app.utils.json_parser import parse_dict_from_text
from app.utils.validators import validate_schema
from app.utils.helpers import normalize

logger = logging.getLogger(__name__)


def _as_state(value: Dict[str, object]) -> ExtractionState:
    return cast(ExtractionState, cast(object, value))


def preprocess_image_node(state: ExtractionState) -> ExtractionState:
    """이미지 전처리 노드"""
    # 이미지는 이미 bytes로 들어오므로 추가 전처리 없음
    # 필요시 여기서 이미지 검증 등 수행
    return state


def call_gemini_vision_node(state: ExtractionState) -> ExtractionState:
    """Gemini Vision API 호출 노드"""
    new_state = dict(state)
    try:
        logger.info("Calling Gemini Vision API...")
        raw_response = gemini_client.generate_with_vision(
            prompt=USER_PROMPT,
            image_bytes=state["image_bytes"],
            temperature=0.3,
            max_output_tokens=2000
        )
        if not raw_response or not raw_response.strip():
            logger.warning("Gemini returned empty response")
            new_state["raw_response"] = None
            new_state["errors"] = state.get("errors", []) + ["Empty response from API"]
        else:
            logger.info(f"API response received (length: {len(raw_response)})")
            new_state["raw_response"] = raw_response
            new_state["errors"] = []
    except Exception as e:
        # API 호출 실패 시 에러만 저장하고 final_result는 설정하지 않음
        # (나중에 normalize_result_node에서 처리)
        logger.error(f"Gemini API call failed: {str(e)}", exc_info=True)
        new_state["raw_response"] = None
        new_state["errors"] = state.get("errors", []) + [f"API call failed: {str(e)}"]
    return _as_state(new_state)


# Backward-compatible alias
call_azure_openai_node = call_gemini_vision_node


def parse_json_node(state: ExtractionState) -> ExtractionState:
    """JSON 파싱 노드 - attribute extraction용 (딕셔너리만 허용)"""
    raw_response = state.get("raw_response")
    if raw_response:
        logger.info("Parsing JSON from response...")
        logger.info(f"Raw response (first 500 chars): {raw_response[:500]}")
        
        # Attribute extraction은 딕셔너리만 필요하므로 parse_dict_from_text 사용
        parsed, repaired = parse_dict_from_text(raw_response)
        
        logger.info(f"Parse result: parsed={'exists' if parsed is not None else 'None'}, type={type(parsed)}")
        
        # 상태 업데이트
        new_state = dict(state)
        
        if parsed is None:
            logger.warning(f"JSON parsing failed. Repaired text head: {repaired[:160]}")
            new_state["parsed_json"] = None
            new_state["errors"] = state.get("errors", []) + [
                f"JSON parsing failed or returned non-dict. Response preview: {raw_response[:200]}"
            ]
        else:
            # 딕셔너리인 경우만 성공으로 처리
            logger.info(f"Parsed JSON keys: {list(parsed.keys())}")
            new_state["parsed_json"] = parsed
            logger.info("JSON parsing successful - parsed_json set in state")
            logger.info(f"State after parse: parsed_json={'exists' if new_state.get('parsed_json') else 'None'}")
        
        return _as_state(new_state)
    else:
        logger.warning("No raw_response to parse")
        return state


def validate_schema_node(state: ExtractionState) -> ExtractionState:
    """스키마 검증 노드"""
    parsed_json = state.get("parsed_json")
    logger.info(f"validate_schema_node: parsed_json={'exists' if parsed_json is not None else 'None'}, type={type(parsed_json)}")
    
    if parsed_json is not None:
        logger.info("Validating schema...")
        ok, errs = validate_schema(parsed_json)
        if ok:
            # 검증 성공 - 정규화 후 최종 결과 설정
            logger.info("Schema validation successful")
            normalized = normalize(parsed_json)
            new_state = dict(state)
            new_state["final_result"] = normalized
            new_state["confidence"] = normalized.get("confidence", 0.5)
            return _as_state(new_state)
        else:
            # 검증 실패 - 에러 저장
            logger.warning(f"Schema validation failed: {errs[:3]}")
            new_state = dict(state)
            new_state["errors"] = errs
            return _as_state(new_state)
    else:
        logger.warning("No parsed_json to validate")
        # parsed_json이 None인데 raw_response가 있으면 파싱 문제
        raw_response = state.get("raw_response")
        if raw_response:
            logger.error(
                "parsed_json is None but raw_response exists! This indicates a state update issue."
            )
            logger.error(f"Raw response: {raw_response[:500]}")
        return state


def retry_node(state: ExtractionState) -> ExtractionState:
    """재시도 노드"""
    new_state = dict(state)
    
    if state.get("retry_count", 0) >= 1:
        # 이미 재시도했으면 더 이상 재시도하지 않음
        logger.info("Already retried, skipping retry")
        return _as_state(new_state)
    
    if state.get("errors") and not state.get("final_result"):
        # 에러가 있고 최종 결과가 없으면 재시도
        logger.info(f"Retrying with errors: {state['errors'][:2]}")
        retry_prompt = build_retry_prompt(state["errors"])
        try:
            raw_response = gemini_client.generate_with_vision(
                prompt=retry_prompt,
                image_bytes=state["image_bytes"],
                temperature=0.2,
                max_output_tokens=2000
            )
            if not raw_response or not raw_response.strip():
                logger.warning("Retry returned empty response")
                new_state["raw_response"] = None
                new_state["errors"] = state.get("errors", []) + ["Empty response from retry API call"]
            else:
                logger.info(f"Retry response received (length: {len(raw_response)})")
                new_state["raw_response"] = raw_response
                new_state["retry_count"] = state.get("retry_count", 0) + 1
                new_state["errors"] = []  # 재시도 시 에러 초기화
        except Exception as e:
            logger.error(f"Retry API call failed: {str(e)}", exc_info=True)
            new_state["errors"] = state.get("errors", []) + [f"Retry failed: {str(e)}"]
    else:
        logger.info("No retry needed (no errors or final_result exists)")
    
    return _as_state(new_state)


def normalize_result_node(state: ExtractionState) -> ExtractionState:
    """결과 정규화 노드"""
    new_state = dict(state)
    
    if state.get("final_result"):
        # 이미 최종 결과가 있으면 그대로 반환
        logger.info("Final result already exists, skipping normalization")
        return _as_state(new_state)
    
    parsed_json = state.get("parsed_json")
    if isinstance(parsed_json, dict):
        # 파싱은 성공했지만 검증 실패한 경우 정규화하여 반환
        logger.info("Normalizing parsed JSON (schema validation may have failed)")
        normalized = normalize(parsed_json)
        errors = state.get("errors", [])
        if errors:
            meta = normalized.get("meta") if isinstance(normalized, dict) else None
            if not isinstance(meta, dict):
                meta = {"notes": ""}
                if isinstance(normalized, dict):
                    normalized["meta"] = meta
            notes = meta.get("notes") if isinstance(meta, dict) else ""
            if not isinstance(notes, str):
                notes = ""
            meta["notes"] = (
                f"{notes} | SCHEMA_INVALID: {', '.join(errors[:3])}"
            )[:300]
        new_state["final_result"] = normalized
        new_state["confidence"] = normalized.get("confidence", 0.2)
        logger.info(f"Normalized result with confidence: {new_state['confidence']}")
    else:
        # 모든 시도 실패 시 기본값 반환
        logger.error(f"All extraction attempts failed. Errors: {state.get('errors', [])}")
        state_summary = (
            f"State: raw_response={'exists' if state.get('raw_response') else 'None'}, "
            f"parsed_json={'exists' if state.get('parsed_json') else 'None'}, "
            f"retry_count={state.get('retry_count', 0)}"
        )
        logger.error(state_summary)
        out = copy.deepcopy(DEFAULT_OBJ)
        error_summary = "; ".join(state.get("errors", [])[:3]) if state.get("errors") else "Unknown error"
        if not isinstance(out, dict):
            out = {"meta": {"notes": ""}}
        meta = out.get("meta")
        if not isinstance(meta, dict):
            meta = {"notes": ""}
            out["meta"] = meta
        meta_notes = meta.get("notes") if isinstance(meta.get("notes"), str) else ""
        meta["notes"] = f"All extraction attempts failed: {error_summary}" if not meta_notes else f"{meta_notes} | All extraction attempts failed: {error_summary}"
        new_state["final_result"] = out
        new_state["confidence"] = 0.1
    
    return _as_state(new_state)


def should_retry(state: ExtractionState) -> str:
    """재시도 여부 결정"""
    if state.get("final_result"):
        logger.info("Final result exists, going to normalize")
        return "end"  # "end"는 워크플로우에서 "normalize"로 매핑됨
    if state.get("retry_count", 0) >= 1:
        logger.info("Already retried, going to normalize")
        return "normalize"
    if state.get("errors") and not state.get("final_result"):
        logger.info("Errors exist and no final result, going to retry")
        return "retry"
    logger.info("No errors or already processed, going to normalize")
    return "normalize"
