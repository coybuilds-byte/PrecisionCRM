# Resume Parser Service

A Python-based FastAPI service for parsing resumes and extracting contact information from PDF and DOCX files.

## Features

- **PDF Support**: Extract text from PDF resumes using pdfplumber
- **DOCX Support**: Extract text from Word documents using python-docx
- **Contact Extraction**: Automatically extract:
  - Full name
  - Email address
  - Phone number
  - Address/Location
  - LinkedIn profile
  - Skills
- **REST API**: FastAPI-based service with JSON responses
- **Error Handling**: Robust error handling for corrupted files

## Installation

Python dependencies are already installed in the project. If you need to reinstall:

```bash
cd python-services
pip install -r requirements.txt
```

## Running the Service

### Method 1: Direct Python
```bash
cd python-services/resume_parser
python main.py
```

### Method 2: Using uvicorn
```bash
cd python-services/resume_parser
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Method 3: Using the shell script
```bash
bash python-services/run_resume_parser.sh
```

The service will start on http://localhost:8001

## API Endpoints

### Root Endpoint
- **URL**: `GET /`
- **Description**: Service health check
- **Response**: 
```json
{
  "service": "Resume Parser Service",
  "status": "running",
  "version": "1.0.0"
}
```

### Health Check
- **URL**: `GET /health`
- **Description**: Health status endpoint
- **Response**: 
```json
{
  "status": "healthy"
}
```

### Parse Resume
- **URL**: `GET /parse`
- **Parameters**: 
  - `file_path` (required): Path to the resume file (local path or URL)
- **Description**: Parse a resume and extract contact information
- **Response**:
```json
{
  "success": true,
  "file_path": "path/to/resume.pdf",
  "file_type": ".pdf",
  "extracted_data": {
    "contact": {
      "full_name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "(555) 123-4567",
      "address": "San Francisco, CA",
      "linkedin": "https://linkedin.com/in/johndoe",
      "skills": ["Python", "JavaScript", "React"]
    },
    "raw_text": "Full resume text content..."
  },
  "text_length": 2500
}
```

## Integration with Node.js Backend

To integrate this service with your Node.js backend, you can make HTTP requests to the service:

```javascript
// Example Node.js integration
const axios = require('axios');

async function parseResume(filePath) {
  try {
    const response = await axios.get('http://localhost:8001/parse', {
      params: { file_path: filePath }
    });
    return response.data;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}
```

## Testing

### Run Unit Tests
```bash
cd python-services
python -m pytest tests/test_resume_parser.py -v
```

### Test API Endpoints
```bash
cd python-services
python test_api.py
```

## File Structure

```
python-services/
├── resume_parser/
│   ├── main.py               # FastAPI application
│   ├── text_extractor.py     # PDF/DOCX text extraction
│   └── contact_mapper.py     # Contact information extraction
├── tests/
│   └── test_resume_parser.py # Unit tests
├── requirements.txt          # Python dependencies
├── run_resume_parser.sh      # Startup script
├── test_api.py              # API testing script
└── README.md                # Documentation
```

## Supported File Formats

- PDF (.pdf)
- Microsoft Word (.docx, .doc)

## Error Handling

The service handles various error scenarios:
- File not found (404)
- Unsupported file format (400)
- Corrupted files (422)
- Internal server errors (500)

## Development

To modify the service:

1. Edit the Python files in `python-services/resume_parser/`
2. Add new extraction patterns in `contact_mapper.py`
3. Update tests in `tests/test_resume_parser.py`
4. Restart the service for changes to take effect

## Troubleshooting

If the service doesn't start:
1. Ensure Python 3.11+ is installed
2. Check that port 8001 is not in use
3. Verify all dependencies are installed
4. Check logs for error messages

## Contact

For issues or questions about this service, please refer to the main project documentation.