"""Phase E — SSE Live Event Streaming endpoint."""

import asyncio
import json

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.agents.agentic_runner import run_agentic_loop

router = APIRouter(prefix="/api")


@router.get("/analyze/stream")
async def analyze_stream(
    q: str = Query(..., description="User service request (Urdu/English)"),
    user_lat: float = Query(None, description="Device GPS latitude"),
    user_lng: float = Query(None, description="Device GPS longitude"),
):
    """
    SSE endpoint — streams agentic events in real time.

    Connect with browser EventSource:
      new EventSource('http://localhost:8001/api/analyze/stream?q=plumber+DHA')

    Event types:
      agent_start   — tool call beginning (step, tool, tool_display_name, icon, args)
      agent_done    — tool call finished  (step, tool, summary, duration_ms, status)
      complete      — pipeline done       (ranked_providers, gemini_final_reasoning, intent, ...)
      clarification — Gemini asks user    (clarification obj, tool_call_trace)
      error         — unhandled exception (message)
    """

    async def event_gen():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_event(event_type: str, data: dict) -> None:
            await queue.put((event_type, data))

        async def _run() -> None:
            try:
                await run_agentic_loop(
                    q,
                    user_lat=user_lat,
                    user_lng=user_lng,
                    on_event=on_event,
                )
            except Exception as exc:
                await queue.put(("error", {"message": str(exc)[:300]}))
            finally:
                await queue.put(None)  # sentinel — loop ends

        task = asyncio.create_task(_run())

        elapsed = 0
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    elapsed += 15
                    if elapsed >= 120:
                        yield (
                            f"event: error\n"
                            f"data: {json.dumps({'message': 'Agent timed out after 120 seconds'})}\n\n"
                        )
                        break
                    # Keep-alive ping — browser EventSource ignores SSE comments
                    yield ": ping\n\n"
                    continue

                if item is None:
                    break
                event_type, data = item
                elapsed = 0  # reset on real event
                try:
                    payload = json.dumps(data, ensure_ascii=False)
                except (TypeError, ValueError) as exc:
                    payload = json.dumps({"message": f"Serialization error: {exc}"[:200]})
                    event_type = "error"
                yield f"event: {event_type}\ndata: {payload}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
