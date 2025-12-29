import ClientCard from '../ClientCard';

export default function ClientCardExample() {
  // todo: remove mock functionality
  return (
    <div className="max-w-md">
      <ClientCard
        id="1"
        companyName="TechStartup Inc."
        contactName="Michael Chen"
        contactEmail="michael.chen@techstartup.com"
        contactPhone="(555) 987-6543"
        website="https://techstartup.com"
        address="123 Innovation Drive, San Francisco, CA"
        agreementSigned="2024-01-15"
        activePositions={3}
        onViewDetails={() => console.log('View client details clicked')}
        onAddPosition={() => console.log('Add position clicked')}
        onContact={() => console.log('Contact client clicked')}
      />
    </div>
  );
}