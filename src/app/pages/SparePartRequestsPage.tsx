import { useNavigate } from 'react-router';
import { SparePartRequests } from '../components/services/SparePartRequests';
export function SparePartRequestsPage() {
  const navigate = useNavigate();
  return <div className="space-y-6 p-4 sm:p-8"><button onClick={() => navigate('/services')} className="text-blue-600">← Service</button><h1 className="text-2xl font-semibold">OEM Requests</h1><SparePartRequests /></div>;
}
