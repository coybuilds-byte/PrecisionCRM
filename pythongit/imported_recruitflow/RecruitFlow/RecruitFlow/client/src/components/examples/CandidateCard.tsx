import CandidateCard from '../CandidateCard';

export default function CandidateCardExample() {
  // todo: remove mock functionality
  return (
    <div className="max-w-md">
      <CandidateCard
        id="1"
        firstName="Sarah"
        lastName="Johnson"
        email="sarah.johnson@email.com"
        phone="(555) 123-4567"
        currentPosition="Senior Software Engineer"
        currentCompany="TechCorp"
        location="San Francisco, CA"
        skills={["React", "TypeScript", "Node.js", "AWS", "PostgreSQL", "Docker"]}
        applicationStatus="interviewed"
        onContact={() => console.log('Contact candidate clicked')}
        onViewResume={() => console.log('View resume clicked')}
        onViewDetails={() => console.log('View details clicked')}
      />
    </div>
  );
}