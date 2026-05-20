"""
Groq Function-Calling Orchestration Loop
Replaces Gemini with Groq (llama-3.3-70b-versatile) — OpenAI-compatible API.
"""

import os
import json
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

from groq import AsyncGroq

from app.agents.tools import REGISTERED_TOOLS, TOOL_DISPLAY_META, dispatch_tool
from app.models.schemas import AgentRunResult, ToolCallStep

MAX_ITERATIONS = 8
AGENT_MODEL = os.getenv("AGENT_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are ServiceAI's autonomous booking assistant for Pakistan.
Your job is to understand service requests and find the best matching local service providers.

You have six tools: parse_intent, scrape_realtime_providers, search_providers, rank_providers, search_web_providers, ask_clarification.

Follow this workflow for every request:
1. Call parse_intent with the exact user text to extract structured intent (service type, city, area, budget, urgency).
2. Call scrape_realtime_providers with the detected service type, location, and city.
   - This fetches LIVE data from the web: real business names, addresses, phone numbers, GPS coordinates, ratings, and opening hours.
   - Results are automatically saved to a file for future reference.
3. Also call search_providers using the extracted service_category and city (and area if detected) to check the local database.
4. If search_providers returns found=0 AND an area was specified, call search_providers again WITHOUT the area for a city-wide search.
5. If providers were found in the local database, call rank_providers to score and rank them.
6. Write a final 2-3 sentence summary in English covering:
   - What service was searched and in which location
   - Live scrape results: top business names, phone numbers, and ratings if available
   - Database results (if any): top ranked provider with score, distance, and reason
   - Advise the user to call the businesses directly if only web/live results are available

Important rules:
- Always call scrape_realtime_providers — it returns real-time accurate data that users can act on immediately
- Only call ask_clarification if the service type is truly impossible to determine
- Never produce a final answer before completing steps 1 and 2 at minimum
- Be specific: include real names, phone numbers, and ratings from tool results"""

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


@dataclass
class RunContext:
    user_text: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    parsed_intent: Optional[dict] = None
    search_result: Optional[object] = None
    ranked_providers: Optional[list] = None
    clarification: Optional[dict] = None
    web_results: Optional[list] = None
    tool_trace: list = field(default_factory=list)
    start_time: float = field(default_factory=time.time)


async def run_agentic_loop(
    user_text: str,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    on_event: Optional[Callable] = None,
) -> AgentRunResult:
    ctx = RunContext(user_text=user_text, user_lat=user_lat, user_lng=user_lng)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_text},
    ]

    iterations = 0

    while iterations < MAX_ITERATIONS:
        iterations += 1

        try:
            try:
                response = await client.chat.completions.create(
                    model=AGENT_MODEL,
                    messages=messages,
                    tools=REGISTERED_TOOLS,
                    tool_choice="auto",
                    temperature=0.1,
                    max_tokens=2048,
                )
            except Exception as api_exc:
                exc_str = str(api_exc)
                if "429" in exc_str or "rate_limit" in exc_str.lower() or "limit reached" in exc_str.lower():
                    print(f"[agentic_runner] Rate limit hit for {AGENT_MODEL}. Falling back to llama-3.1-8b-instant...")
                    response = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=messages,
                        tools=REGISTERED_TOOLS,
                        tool_choice="auto",
                        temperature=0.1,
                        max_tokens=2048,
                    )
                else:
                    raise
        except Exception as api_exc:
            exc_str = str(api_exc)
            if "429" in exc_str or "rate_limit" in exc_str.lower() or "quota" in exc_str.lower():
                raise RuntimeError(
                    "QUOTA_EXCEEDED: Groq rate limit reached. "
                    "Please retry in ~60s, or enable DEMO_MODE in constants.js."
                ) from api_exc
            raise

        choice = response.choices[0]
        msg = choice.message

        tool_calls = msg.tool_calls or []
        final_text = msg.content or ""

        # ── Branch: model issued tool calls ──────────────────────────────────
        if tool_calls:
            # Append assistant message with tool calls to history
            messages.append({
                "role":       "assistant",
                "content":    msg.content or "",
                "tool_calls": [
                    {
                        "id":   tc.id,
                        "type": "function",
                        "function": {
                            "name":      tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            })

            for tc in tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    fn_args = {}

                display_name, icon = TOOL_DISPLAY_META.get(fn_name, (fn_name, "cog-outline"))

                if on_event:
                    await on_event("agent_start", {
                        "step":             len(ctx.tool_trace) + 1,
                        "tool":             fn_name,
                        "tool_display_name": display_name,
                        "icon":             icon,
                        "args":             fn_args,
                        "status":           "running",
                    })

                t0 = time.time()
                result_dict, summary, status = await _safe_dispatch(fn_name, fn_args, ctx)
                duration_ms = int((time.time() - t0) * 1000)

                step = ToolCallStep(
                    step=len(ctx.tool_trace) + 1,
                    tool=fn_name,
                    tool_display_name=display_name,
                    args=fn_args,
                    result_summary=summary,
                    status=status,
                    duration_ms=duration_ms,
                    icon=icon,
                )
                ctx.tool_trace.append(step)

                if on_event:
                    await on_event("agent_done", {
                        "step":             step.step,
                        "tool":             fn_name,
                        "tool_display_name": display_name,
                        "icon":             icon,
                        "summary":          summary,
                        "duration_ms":      duration_ms,
                        "status":           status,
                    })

                # Feed tool result back to model (guard against non-serializable data)
                try:
                    content = json.dumps(result_dict)
                except (TypeError, ValueError):
                    content = json.dumps({"summary": summary, "status": status})
                messages.append({
                    "role":         "tool",
                    "tool_call_id": tc.id,
                    "content":      content,
                })

                if fn_name == "ask_clarification":
                    total_ms = int((time.time() - ctx.start_time) * 1000)
                    if on_event:
                        await on_event("clarification", {
                            "clarification":    ctx.clarification,
                            "tool_call_trace":  [s.model_dump() for s in ctx.tool_trace],
                            "total_duration_ms": total_ms,
                        })
                    return AgentRunResult(
                        intent=ctx.parsed_intent,
                        ranked_providers=[],
                        providers_found=0,
                        tool_call_trace=ctx.tool_trace,
                        gemini_final_reasoning="",
                        total_duration_ms=total_ms,
                        iterations=iterations,
                        model=AGENT_MODEL,
                        clarification=ctx.clarification,
                        web_results=ctx.web_results,
                    )

        # ── Branch: model produced final reasoning text ───────────────────────
        elif final_text:
            total_ms = int((time.time() - ctx.start_time) * 1000)

            if on_event:
                await on_event("complete", {
                    "ranked_providers":       ctx.ranked_providers or [],
                    "providers_found":        len(ctx.ranked_providers) if ctx.ranked_providers else 0,
                    "tool_call_trace":        [s.model_dump() for s in ctx.tool_trace],
                    "gemini_final_reasoning": final_text,
                    "intent":                 ctx.parsed_intent,
                    "total_duration_ms":      total_ms,
                    "iterations":             iterations,
                    "model":                  AGENT_MODEL,
                    "web_results":            ctx.web_results or [],
                })

            return AgentRunResult(
                intent=ctx.parsed_intent,
                ranked_providers=ctx.ranked_providers or [],
                providers_found=len(ctx.ranked_providers) if ctx.ranked_providers else 0,
                tool_call_trace=ctx.tool_trace,
                gemini_final_reasoning=final_text,
                total_duration_ms=total_ms,
                iterations=iterations,
                model=AGENT_MODEL,
                clarification=None,
                web_results=ctx.web_results,
            )

        else:
            break

    total_ms = int((time.time() - ctx.start_time) * 1000)
    return AgentRunResult(
        intent=ctx.parsed_intent,
        ranked_providers=ctx.ranked_providers or [],
        providers_found=len(ctx.ranked_providers) if ctx.ranked_providers else 0,
        tool_call_trace=ctx.tool_trace,
        gemini_final_reasoning="Agent search complete. Review the results below.",
        total_duration_ms=total_ms,
        iterations=iterations,
        model=AGENT_MODEL,
        clarification=None,
        web_results=ctx.web_results,
    )


async def _safe_dispatch(fn_name: str, fn_args: dict, ctx: RunContext) -> tuple[dict, str, str]:
    try:
        result, summary = await dispatch_tool(fn_name, fn_args, ctx)
        return result, summary, "success"
    except Exception as exc:
        err = str(exc)[:150]
        return {"error": err, "tool": fn_name}, f"{fn_name} failed: {err}", "error"
