import ContactTimeline from '../ContactTimeline';

export default function ContactTimelineExample() {
  // todo: remove mock functionality
  const mockContacts = [
    {
      id: '1',
      type: 'phone' as const,
      subject: 'Initial screening call',
      notes: 'Discussed background, current role, and interest in new opportunities. Very positive conversation, candidate is actively looking.',
      contactDate: new Date('2024-09-24'),
      recruiterName: 'John Smith',
      followUpDate: new Date('2024-09-28'),
    },
    {
      id: '2',
      type: 'email' as const,
      subject: 'Follow-up with position details',
      notes: 'Sent detailed job description and company information. Candidate expressed strong interest.',
      contactDate: new Date('2024-09-22'),
      recruiterName: 'John Smith',
    },
    {
      id: '3',
      type: 'video_call' as const,
      subject: 'Technical discussion',
      notes: 'In-depth conversation about technical requirements and career goals.',
      contactDate: new Date('2024-09-20'),
      recruiterName: 'Sarah Johnson',
    },
  ];

  return (
    <div className="max-w-2xl">
      <ContactTimeline
        contacts={mockContacts}
        onAddContact={() => console.log('Add contact clicked')}
      />
    </div>
  );
}