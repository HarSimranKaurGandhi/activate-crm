export const LoadingState = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="py-12 text-center text-gray-500">{label}</div>
);

export const EmptyState = ({ label }: { label: string }) => (
  <div className="py-12 text-center text-gray-500">{label}</div>
);

export const FieldError = ({ message }: { message?: string }) => (
  message ? <p className="text-sm text-red-600 mt-1">{message}</p> : null
);

