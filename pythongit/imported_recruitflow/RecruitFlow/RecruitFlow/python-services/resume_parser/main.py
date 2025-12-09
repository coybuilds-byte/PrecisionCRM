"""
FastAPI Resume Parsing Service
Main application file that handles resume parsing requests
"""
import os
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

try:
    from text_extractor import extract_text_from_pdf, extract_text_from_docx
    from contact_mapper import extract_contact_info
except ImportError:
    # Fallback for different import contexts
    from resume_parser.text_extractor import extract_text_from_pdf, extract_text_from_docx
    from resume_parser.contact_mapper import extract_contact_info
    # Affinda client (optional third-party resume parser)
    from resume_parser.affinda_client import parse_with_affinda
else:
    # Normal import path
    from resume_parser.affinda_client import parse_with_affinda

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Resume Parser Service", version="1.0.0")

# Configure CORS to allow requests from the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def download_file_from_storage(file_path: str) -> bytes:
    """Download file from object storage if it's a URL"""
    if file_path.startswith("http://") or file_path.startswith("https://"):
        async with httpx.AsyncClient() as client:
            response = await client.get(file_path)
            if response.status_code == 200:
                return response.content
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Failed to download file from URL: {file_path}"
                )
    else:
        # Local file path
        local_path = Path(file_path)
        if not local_path.exists():
            # Try checking from project root
            project_root = Path.cwd()
            local_path = project_root / file_path
            if not local_path.exists():
                raise HTTPException(
                    status_code=404, 
                    detail=f"File not found: {file_path}"
                )
        
        with open(local_path, "rb") as f:
            return f.read()


@app.get("/")
async def root():
    """Root endpoint - service health check"""
    return {
        "service": "Resume Parser Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/parse")
async def parse_resume(
    file_path: str = Query(..., description="Path to the resume file (local or URL)")
) -> Dict[str, Any]:
    """
    Parse a resume from a file path or URL
    
    Args:
        file_path: Path to the resume file (can be local path or URL)
        
    Returns:
        Structured JSON with extracted resume information
    """
    try:
        logger.info(f"Starting resume parse for: {file_path}")
        
        # Determine file extension
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension not in ['.pdf', '.docx', '.doc']:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file_extension}. Supported formats: .pdf, .docx"
            )
        
        # Download or read the file
        file_content = await download_file_from_storage(file_path)

        # If an Affinda API key is configured, prefer using Affinda for parsing.
        # Set `AFFINDA_API_KEY` in the environment (and optionally `AFFINDA_API_URL`).
        affinda_key = os.getenv("AFFINDA_API_KEY")

        extracted_text = ""
        affinda_response = None
        if affinda_key:
            try:
                # filename may be needed by Affinda (use basename of path)
                filename = Path(file_path).name or "resume"
                affinda_response, affinda_text = await parse_with_affinda(file_content, filename=filename, api_key=affinda_key)
                if affinda_text:
                    extracted_text = affinda_text
                else:
                    # fallback: try to serialize returned JSON summary into text
                    try:
                        import json
                        extracted_text = json.dumps(affinda_response)
                    except Exception:
                        extracted_text = ""
            except Exception as e:
                logger.warning(f"Affinda parsing failed, falling back to local extraction: {e}")

        # If we didn't get good text yet, fallback to local extraction
        if not extracted_text:
            if file_extension == '.pdf':
                extracted_text = extract_text_from_pdf(file_content)
            elif file_extension in ['.docx', '.doc']:
                extracted_text = extract_text_from_docx(file_content)
        
        if not extracted_text:
            raise HTTPException(
                status_code=422,
                detail="Failed to extract text from the file. The file might be corrupted or empty."
            )
        
        # Extract contact information
        # If Affinda returned structured fields, prefer them. Otherwise run local contact extraction.
        contact_info = {}
        def _recursive_search(obj, candidate_keys):
            # Search dicts and lists recursively for any of the candidate keys
            if obj is None:
                return None
            if isinstance(obj, dict):
                for key in candidate_keys:
                    if key in obj and obj[key]:
                        return obj[key]
                # search common containers first
                for container in ("data", "parsed", "parsed_resume", "personal", "contact", "personal_details", "attributes", "profile"):
                    node = obj.get(container)
                    if isinstance(node, dict):
                        for key in candidate_keys:
                            if key in node and node[key]:
                                return node[key]
                # then recurse
                for v in obj.values():
                    res = _recursive_search(v, candidate_keys)
                    if res:
                        return res
            elif isinstance(obj, list):
                for item in obj:
                    res = _recursive_search(item, candidate_keys)
                    if res:
                        return res
            return None

        def _normalize_skills(raw):
            if raw is None:
                return []
            if isinstance(raw, list):
                return [str(x) for x in raw]
            if isinstance(raw, str):
                # split common delimiters
                return [s.strip() for s in re.split(r'[;,|\\n]+', raw) if s.strip()]
            return [str(raw)]

        import re

        if affinda_response and isinstance(affinda_response, dict):
            # Attempt to extract common fields using flexible searches
            contact_info["full_name"] = _recursive_search(affinda_response, ["name", "full_name", "given_name", "first_name", "formatted_name"]) or None
            contact_info["email"] = _recursive_search(affinda_response, ["email", "emails"]) or None
            contact_info["phone"] = _recursive_search(affinda_response, ["phone", "phones", "mobile"]) or None
            contact_info["address"] = _recursive_search(affinda_response, ["address", "location", "locations", "addresses"]) or None
            contact_info["linkedin"] = _recursive_search(affinda_response, ["linkedin", "linkedin_url", "linkedin_profile", "profile_url"]) or None
            raw_skills = _recursive_search(affinda_response, ["skills", "skill", "keywords", "expertise"]) or []
            contact_info["skills"] = _normalize_skills(raw_skills)

        # If Affinda didn't provide structured info, use the local extractor on extracted_text
        if not any(contact_info.values()):
            contact_info = extract_contact_info(extracted_text)
        
        # Prepare response with flat structure matching Express backend expectations
        response = {
            "success": True,
            "file_path": file_path,
            "file_type": file_extension,
            # Flat structure that Express backend expects
            "text": extracted_text,  # Full resume text (Express expects 'text' not 'raw_text')
            "name": contact_info.get('full_name') or '',  # Map full_name to name
            "email": contact_info.get('email') or '',
            "phone": contact_info.get('phone') or '',
            "address": contact_info.get('address') or '',
            "linkedin": contact_info.get('linkedin') or '',
            "skills": contact_info.get('skills') or [],
            # Keep text_length for debugging/info
            "text_length": len(extracted_text)
        }
        
        logger.info(f"Successfully parsed resume: {file_path}")
        logger.info(f"Extracted fields - Name: {response['name']}, Email: {response['email']}, Skills count: {len(response['skills'])}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing resume {file_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error while parsing resume: {str(e)}"
        )


if __name__ == "__main__":
    # Run the FastAPI app on port 8001
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )