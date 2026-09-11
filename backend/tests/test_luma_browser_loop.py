"""Playwright's browser fallback must work under uvicorn --reload on Windows.

Root cause (2026-09-11): uvicorn --reload installs WindowsSelectorEventLoopPolicy,
and a Selector loop can't spawn subprocesses, so Playwright couldn't launch
Chromium and "Connect Luma" failed with "Couldn't send the Luma code".
"""
import asyncio
import sys

from app.luma_client import run_on_subprocess_capable_loop


async def _spawn_child() -> str:
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-c", "print('child ok')", stdout=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    return out.decode().strip()


def test_subprocess_work_runs_even_when_the_callers_loop_is_a_selector_loop():
    # The exact condition uvicorn --reload creates on Windows.
    loop = asyncio.SelectorEventLoop()
    try:
        result = loop.run_until_complete(run_on_subprocess_capable_loop(_spawn_child))
    finally:
        loop.close()

    assert result == "child ok"
