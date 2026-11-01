import { OemSettings } from '../../components/services/OemSettings';

export const OemMaster = () => (
  <div className="p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">OEM Master</h2>
      <OemSettings />
    </div>
  </div>
);
