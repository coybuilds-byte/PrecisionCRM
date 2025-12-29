import PositionCard from '../PositionCard';

export default function PositionCardExample() {
  // todo: remove mock functionality
  return (
    <div className="max-w-md">
      <PositionCard
        id="1"
        title="Senior Full Stack Developer"
        companyName="TechStartup Inc."
        location="San Francisco, CA (Remote)"
        salary="$120,000 - $160,000"
        status="open"
        applicantCount={12}
        createdAt={new Date('2024-09-20')}
        onViewDetails={() => console.log('View position details clicked')}
        onViewApplicants={() => console.log('View applicants clicked')}
        onEditPosition={() => console.log('Edit position clicked')}
      />
    </div>
  );
}