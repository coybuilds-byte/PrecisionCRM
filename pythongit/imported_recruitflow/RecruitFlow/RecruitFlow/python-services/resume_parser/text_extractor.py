"""
Text Extraction Module
Handles extraction of text from various document formats (PDF, DOCX)
"""
import io
import logging
from typing import Optional
import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extract text content from a PDF file
    
    Args:
        file_content: PDF file content as bytes
        
    Returns:
        Extracted text as string
    """
    try:
        text_content = []
        
        # Create a BytesIO object from the file content
        pdf_file = io.BytesIO(file_content)
        
        # Use pdfplumber to extract text
        with pdfplumber.open(pdf_file) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {str(e)}")
                    continue
        
        # Join all pages with newlines
        full_text = "\n".join(text_content)
        return full_text.strip()
        
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        # Try a more basic extraction approach if pdfplumber fails
        try:
            import PyPDF2
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text_content = []
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content.append(page.extract_text())
            
            full_text = "\n".join(text_content)
            return full_text.strip()
        except:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """
    Extract text content from a DOCX file
    
    Args:
        file_content: DOCX file content as bytes
        
    Returns:
        Extracted text as string
    """
    try:
        # Create a BytesIO object from the file content
        docx_file = io.BytesIO(file_content)
        
        # Use python-docx to extract text
        document = Document(docx_file)
        
        text_content = []
        
        # Extract text from paragraphs
        for paragraph in document.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text.strip())
        
        # Also extract text from tables
        for table in document.tables:
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text:
                        row_text.append(cell_text)
                if row_text:
                    text_content.append(" | ".join(row_text))
        
        # Join all text with newlines
        full_text = "\n".join(text_content)
        return full_text.strip()
        
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")


def extract_text_from_file(file_path: str) -> Optional[str]:
    """
    Extract text from a file based on its extension
    
    Args:
        file_path: Path to the file
        
    Returns:
        Extracted text or None if extraction fails
    """
    try:
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        if file_path.lower().endswith('.pdf'):
            return extract_text_from_pdf(file_content)
        elif file_path.lower().endswith(('.docx', '.doc')):
            return extract_text_from_docx(file_content)
        else:
            logger.error(f"Unsupported file format: {file_path}")
            return None
            
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {str(e)}")
        return None