import subprocess
import time
import os

import pytest

SERVER_PORT = os.getenv('PORT', '5000')

@pytest.fixture(scope="session", autouse=True)
def server():
    proc = subprocess.Popen(["python", "src/app.py"], env={**os.environ, "FLASK_DEBUG": "false"})
    time.sleep(3)
    yield
    proc.terminate()
    proc.wait()


@pytest.mark.asyncio
async def test_homepage(page):
    await page.goto(f"http://localhost:{SERVER_PORT}/")
    assert await page.text_content("body") is not None
