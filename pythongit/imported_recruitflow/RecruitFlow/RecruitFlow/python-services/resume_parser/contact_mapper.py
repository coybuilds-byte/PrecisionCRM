"""
Contact Information Extraction Module
Uses regex patterns to extract contact details from resume text
"""
import re
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)


def extract_email(text: str) -> Optional[str]:
    """
    Extract email address from text
    
    Args:
        text: Input text
        
    Returns:
        Email address or None
    """
    # Comprehensive email regex pattern
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    
    matches = re.findall(email_pattern, text)
    if matches:
        # Return the first valid email found
        return matches[0].lower()
    return None


def extract_phone(text: str) -> Optional[str]:
    """
    Extract phone number from text (supports various formats)
    
    Args:
        text: Input text
        
    Returns:
        Phone number or None
    """
    # Phone patterns for various formats
    phone_patterns = [
        r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}',
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # 555-555-5555 or 555.555.5555
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (555) 555-5555
        r'\+\d{1,3}\s?\d{1,14}',  # International format
        r'\b\d{10,14}\b'  # Plain numbers
    ]
    
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        if matches:
            # Clean and return the first phone number
            phone = matches[0]
            # Remove common non-digit characters except + at the beginning
            cleaned = re.sub(r'[^\d+]', '', phone)
            if len(cleaned) >= 10:  # Valid phone numbers should have at least 10 digits
                return phone
    
    return None


def extract_name(text: str) -> Optional[str]:
    """
    Extract full name from text (usually appears at the beginning)
    
    Args:
        text: Input text
        
    Returns:
        Full name or None
    """
    # Get the first few lines where name is likely to appear
    lines = text.split('\n')[:10]
    
    # Common name patterns
    name_patterns = [
        # Look for lines with 2-4 capitalized words
        r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$',
        # Name with middle initial
        r'^([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)$',
        # Name with titles (Mr., Ms., Dr., etc.)
        r'^(?:Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
    ]
    
    for line in lines:
        line = line.strip()
        # Skip lines that are too long (likely not names)
        if len(line) > 50 or len(line) < 3:
            continue
            
        # Skip lines with numbers or special characters (except dots and spaces)
        if re.search(r'[\d@#$%^&*()_+=\[\]{}|\\:";\'<>?,/]', line):
            continue
            
        for pattern in name_patterns:
            match = re.match(pattern, line)
            if match:
                name = match.group(1) if match.lastindex else match.group(0)
                # Additional validation
                words = name.split()
                if 2 <= len(words) <= 4:
                    return name.strip()
    
    # Fallback: Try to find name after common headers
    name_headers = ['Name:', 'Full Name:', 'Candidate Name:', 'Applicant:']
    for header in name_headers:
        pattern = f'{re.escape(header)}\\s*([A-Za-z\\s]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if 2 <= len(name.split()) <= 4:
                return name
    
    return None


def extract_address(text: str) -> Optional[str]:
    """
    Extract address/location information from text
    
    Args:
        text: Input text
        
    Returns:
        Address or location string or None
    """
    # Common address patterns
    address_patterns = [
        # City, State ZIP format
        r'\b([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)\b',
        # City, State format
        r'\b([A-Za-z\s]+,\s*[A-Z]{2})\b',
        # Street address
        r'\b(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Circle|Cir)\.?)\b',
    ]
    
    # Look for location after common headers
    location_headers = ['Address:', 'Location:', 'City:', 'Residence:', 'Lives in:', 'Based in:']
    for header in location_headers:
        pattern = f'{re.escape(header)}\\s*([^\\n]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            location = match.group(1).strip()
            if location and len(location) < 100:
                return location
    
    # Try general patterns
    for pattern in address_patterns:
        matches = re.findall(pattern, text)
        if matches:
            return matches[0]
    
    # Look for common city names or state abbreviations
    state_pattern = r'\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b'
    state_matches = re.findall(state_pattern, text)
    
    if state_matches:
        # Try to find city before state
        for state in state_matches:
            city_pattern = f'([A-Za-z\\s]+),?\\s*{state}'
            match = re.search(city_pattern, text)
            if match:
                return match.group(0).strip()
    
    return None


def extract_linkedin(text: str) -> Optional[str]:
    """
    Extract LinkedIn profile URL from text
    
    Args:
        text: Input text
        
    Returns:
        LinkedIn URL or None
    """
    # LinkedIn URL patterns
    linkedin_patterns = [
        r'(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9\-_]+/?',
        r'linkedin\.com/in/[A-Za-z0-9\-_]+/?',
        r'linkedin\s*:\s*(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9\-_]+/?',
    ]
    
    for pattern in linkedin_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            url = match.group(0)
            # Ensure it starts with https://
            if not url.startswith('http'):
                url = 'https://' + url
            return url
    
    return None


def extract_skills(text: str) -> List[str]:
    """
    Extract skills from text
    
    Args:
        text: Input text
        
    Returns:
        List of skills
    """
    skills = []
    
    # Common skill section headers
    skill_headers = ['Skills:', 'Technical Skills:', 'Core Competencies:', 'Expertise:', 'Technologies:', 'Programming Languages:']
    
    for header in skill_headers:
        pattern = f'{re.escape(header)}\\s*([^\\n]+(?:\\n[^\\n]+)*)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            skill_text = match.group(1)
            # Split by common delimiters
            skill_items = re.split(r'[,;|\n•·]', skill_text)
            for item in skill_items:
                skill = item.strip(' -').strip()
                if skill and len(skill) < 50 and len(skill) > 1:
                    skills.append(skill)
            break
    
    # Deduplicate while preserving order
    seen = set()
    unique_skills = []
    for skill in skills:
        if skill.lower() not in seen:
            seen.add(skill.lower())
            unique_skills.append(skill)
    
    return unique_skills[:20]  # Limit to top 20 skills


def extract_contact_info(text: str) -> Dict[str, Optional[str]]:
    """
    Extract all contact information from resume text
    
    Args:
        text: Resume text
        
    Returns:
        Dictionary with extracted contact information
    """
    logger.info("Starting contact information extraction")
    
    contact_info = {
        'full_name': extract_name(text),
        'email': extract_email(text),
        'phone': extract_phone(text),
        'address': extract_address(text),
        'linkedin': extract_linkedin(text),
        'skills': extract_skills(text)
    }
    
    # Log what was extracted
    extracted_count = sum(1 for v in contact_info.values() if v and (v != []))
    logger.info(f"Extracted {extracted_count} contact fields")
    
    return contact_info