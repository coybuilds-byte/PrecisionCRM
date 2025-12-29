"""
Unit tests for the resume parser service
"""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock
import io

# Add the resume_parser directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'resume_parser'))

from text_extractor import extract_text_from_pdf, extract_text_from_docx
from contact_mapper import (
    extract_email, 
    extract_phone, 
    extract_name,
    extract_address,
    extract_linkedin,
    extract_skills,
    extract_contact_info
)


class TestTextExtractor:
    """Test text extraction functionality"""
    
    def test_extract_text_from_pdf_empty(self):
        """Test PDF extraction with empty content"""
        # Create a minimal PDF-like bytes content
        empty_pdf_content = b'%PDF-1.4\n%%EOF'
        
        with patch('pdfplumber.open') as mock_pdf:
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.pages = []
            mock_pdf.return_value.__enter__.return_value = mock_pdf_instance
            
            result = extract_text_from_pdf(empty_pdf_content)
            assert result == ""
    
    def test_extract_text_from_docx_empty(self):
        """Test DOCX extraction with empty content"""
        with patch('docx.Document') as mock_doc:
            mock_doc_instance = MagicMock()
            mock_doc_instance.paragraphs = []
            mock_doc_instance.tables = []
            mock_doc.return_value = mock_doc_instance
            
            result = extract_text_from_docx(b'fake_docx_content')
            assert result == ""
    
    def test_extract_text_from_pdf_with_content(self):
        """Test PDF extraction with actual content"""
        with patch('pdfplumber.open') as mock_pdf:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "John Doe\nSoftware Engineer\njohn.doe@email.com"
            mock_pdf_instance = MagicMock()
            mock_pdf_instance.pages = [mock_page]
            mock_pdf.return_value.__enter__.return_value = mock_pdf_instance
            
            result = extract_text_from_pdf(b'fake_pdf_content')
            assert "John Doe" in result
            assert "Software Engineer" in result
            assert "john.doe@email.com" in result
    
    def test_extract_text_from_docx_with_content(self):
        """Test DOCX extraction with actual content"""
        with patch('docx.Document') as mock_doc:
            mock_paragraph1 = MagicMock()
            mock_paragraph1.text = "Jane Smith"
            mock_paragraph2 = MagicMock()
            mock_paragraph2.text = "Data Scientist"
            mock_paragraph3 = MagicMock()
            mock_paragraph3.text = "jane.smith@example.com"
            
            mock_doc_instance = MagicMock()
            mock_doc_instance.paragraphs = [mock_paragraph1, mock_paragraph2, mock_paragraph3]
            mock_doc_instance.tables = []
            mock_doc.return_value = mock_doc_instance
            
            result = extract_text_from_docx(b'fake_docx_content')
            assert "Jane Smith" in result
            assert "Data Scientist" in result
            assert "jane.smith@example.com" in result


class TestContactMapper:
    """Test contact information extraction"""
    
    def test_extract_email_valid(self):
        """Test email extraction with valid emails"""
        text = "Contact me at john.doe@example.com or jane_smith123@company.org"
        email = extract_email(text)
        assert email == "john.doe@example.com"
    
    def test_extract_email_invalid(self):
        """Test email extraction with no valid email"""
        text = "No email address here"
        email = extract_email(text)
        assert email is None
    
    def test_extract_phone_various_formats(self):
        """Test phone extraction with various formats"""
        test_cases = [
            ("Call me at (555) 123-4567", "(555) 123-4567"),
            ("Phone: 555.123.4567", "555.123.4567"),
            ("Mobile: +1 555 123 4567", "+1 555 123 4567"),
            ("Tel: 5551234567", "5551234567"),
        ]
        
        for text, expected in test_cases:
            phone = extract_phone(text)
            assert phone is not None, f"Failed to extract phone from: {text}"
    
    def test_extract_phone_no_phone(self):
        """Test phone extraction with no phone number"""
        text = "No phone number in this text"
        phone = extract_phone(text)
        assert phone is None
    
    def test_extract_name_simple(self):
        """Test name extraction"""
        text = """John Michael Doe
        Software Engineer
        john.doe@email.com"""
        
        name = extract_name(text)
        assert name == "John Michael Doe"
    
    def test_extract_name_with_title(self):
        """Test name extraction with title"""
        text = """Dr. Jane Smith
        Data Scientist
        jane@example.com"""
        
        name = extract_name(text)
        assert name == "Jane Smith"
    
    def test_extract_address_formats(self):
        """Test address extraction with various formats"""
        test_cases = [
            ("Lives in San Francisco, CA 94105", "San Francisco, CA 94105"),
            ("Address: New York, NY", "New York, NY"),
            ("Location: Chicago, IL", "Chicago, IL"),
        ]
        
        for text, expected in test_cases:
            address = extract_address(text)
            assert address is not None, f"Failed to extract address from: {text}"
            assert expected in address or address == expected
    
    def test_extract_linkedin(self):
        """Test LinkedIn URL extraction"""
        test_cases = [
            ("LinkedIn: linkedin.com/in/johndoe", "https://linkedin.com/in/johndoe"),
            ("https://www.linkedin.com/in/jane-smith", "https://www.linkedin.com/in/jane-smith"),
            ("Profile: linkedin.com/in/user123", "https://linkedin.com/in/user123"),
        ]
        
        for text, expected in test_cases:
            linkedin = extract_linkedin(text)
            assert linkedin == expected
    
    def test_extract_skills(self):
        """Test skills extraction"""
        text = """
        Technical Skills: Python, JavaScript, React, Node.js, Docker
        Database: PostgreSQL, MongoDB
        Cloud: AWS, Azure
        """
        
        skills = extract_skills(text)
        assert len(skills) > 0
        assert "Python" in skills
        assert "JavaScript" in skills
    
    def test_extract_contact_info_complete(self):
        """Test complete contact info extraction"""
        text = """
        John Doe
        Software Engineer
        
        Email: john.doe@example.com
        Phone: (555) 123-4567
        Location: San Francisco, CA
        LinkedIn: linkedin.com/in/johndoe
        
        Skills: Python, JavaScript, React, Docker, AWS
        """
        
        contact_info = extract_contact_info(text)
        
        assert contact_info['full_name'] == "John Doe"
        assert contact_info['email'] == "john.doe@example.com"
        assert contact_info['phone'] is not None
        assert contact_info['address'] is not None
        assert contact_info['linkedin'] == "https://linkedin.com/in/johndoe"
        assert len(contact_info['skills']) > 0
    
    def test_extract_contact_info_partial(self):
        """Test contact info extraction with partial information"""
        text = """
        Jane Smith
        jane.smith@email.com
        """
        
        contact_info = extract_contact_info(text)
        
        assert contact_info['full_name'] == "Jane Smith"
        assert contact_info['email'] == "jane.smith@email.com"
        assert contact_info['phone'] is None
        assert contact_info['address'] is None
    
    def test_edge_case_empty_text(self):
        """Test extraction with empty text"""
        contact_info = extract_contact_info("")
        
        assert contact_info['full_name'] is None
        assert contact_info['email'] is None
        assert contact_info['phone'] is None
        assert contact_info['address'] is None
        assert contact_info['linkedin'] is None
        assert contact_info['skills'] == []
    
    def test_edge_case_malformed_text(self):
        """Test extraction with malformed text"""
        text = "@#$%^&*()_+{}[]|\\:\";<>?,./~`"
        
        contact_info = extract_contact_info(text)
        
        assert contact_info['full_name'] is None
        assert contact_info['email'] is None
        assert contact_info['phone'] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])