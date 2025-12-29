#!/usr/bin/env python
"""Create a sample PDF resume for testing"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_sample_resume():
    # Create PDF
    doc = SimpleDocTemplate("test-resume.pdf", pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=12
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=6
    )
    
    # Add content
    story.append(Paragraph("Sarah Jane Johnson", title_style))
    story.append(Paragraph("Full Stack Developer", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("Contact Information", heading_style))
    story.append(Paragraph("Email: sarah.johnson@techmail.com", styles['Normal']))
    story.append(Paragraph("Phone: (415) 555-9876", styles['Normal']))
    story.append(Paragraph("Location: New York, NY 10001", styles['Normal']))
    story.append(Paragraph("LinkedIn: https://www.linkedin.com/in/sarahjjohnson", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("Professional Summary", heading_style))
    story.append(Paragraph(
        "Experienced full-stack developer with 6+ years of experience building scalable web applications. "
        "Expertise in React, Python, and cloud technologies. Passionate about creating user-friendly "
        "interfaces and optimizing application performance.",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("Skills", heading_style))
    story.append(Paragraph(
        "Python, JavaScript, React, Django, Flask, Node.js, PostgreSQL, MySQL, AWS, Docker, "
        "Git, REST APIs, GraphQL, Machine Learning, TensorFlow, Agile Development",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("Experience", heading_style))
    story.append(Paragraph("Senior Developer | Innovation Labs | 2021 - Present", styles['Heading3']))
    story.append(Paragraph(
        "• Led development of microservices architecture handling 5M+ requests daily\n"
        "• Implemented machine learning models for user behavior prediction\n"
        "• Reduced application load time by 40% through optimization",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.1*inch))
    
    story.append(Paragraph("Full Stack Developer | Digital Solutions | 2018 - 2021", styles['Heading3']))
    story.append(Paragraph(
        "• Built RESTful APIs serving mobile and web applications\n"
        "• Developed responsive React components for e-commerce platform\n"
        "• Collaborated with design team to improve user experience",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("Education", heading_style))
    story.append(Paragraph(
        "Master of Science in Computer Science\n"
        "Stanford University | 2016 - 2018",
        styles['Normal']
    ))
    
    # Build PDF
    doc.build(story)
    print("Created test-resume.pdf successfully!")

if __name__ == "__main__":
    try:
        create_sample_resume()
    except ImportError:
        print("reportlab not installed. Installing...")
        import subprocess
        subprocess.check_call(["pip", "install", "reportlab"])
        print("Installed reportlab. Running again...")
        create_sample_resume()