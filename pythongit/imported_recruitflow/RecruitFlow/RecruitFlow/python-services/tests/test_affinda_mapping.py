import os
import pytest
from fastapi.testclient import TestClient

import resume_parser.main as main_mod


@pytest.fixture(autouse=True)
def clear_env():
    # Ensure AFFINDA_API_KEY is not leaked between tests
    if 'AFFINDA_API_KEY' in os.environ:
        del os.environ['AFFINDA_API_KEY']
    yield
    if 'AFFINDA_API_KEY' in os.environ:
        del os.environ['AFFINDA_API_KEY']


def test_affinda_mapping_success(monkeypatch):
    """When Affinda returns structured data, the /parse endpoint should map fields."""
    # Sample Affinda-like response with nested data
    affinda_response = {
        "data": {
            "name": "Alice Example",
            "email": "alice@example.com",
            "phones": ["+1 555-0000"],
            "location": "San Francisco, CA",
            "skills": ["Python", "FastAPI"]
        },
        "text": "Alice Example\nPython developer"
    }

    async def mock_parse_with_affinda(file_bytes, filename='resume', api_key=None):
        return affinda_response, affinda_response.get('text')

    async def mock_download(file_path: str):
        return b'fake-bytes'

    # Set API key to trigger Affinda path
    monkeypatch.setenv('AFFINDA_API_KEY', 'test-key')

    # Patch the affinda parser and downloader in the main module
    monkeypatch.setattr(main_mod, 'parse_with_affinda', mock_parse_with_affinda)
    monkeypatch.setattr(main_mod, 'download_file_from_storage', mock_download)

    client = TestClient(main_mod.app)
    resp = client.get('/parse', params={'file_path': 'resume.pdf'})
    assert resp.status_code == 200
    data = resp.json()

    assert data['success'] is True
    # Mapping should prefer Affinda values
    assert data['name'] == 'Alice Example'
    assert data['email'] == 'alice@example.com'
    assert data['phone'] == '+1 555-0000' or data['phone'] == ['+1 555-0000']
    assert 'San Francisco' in data['address']
    assert isinstance(data['skills'], list)
    assert 'Python' in data['skills']
