type ReservationStatusProps = {
  status: string;
};

export default function ReservationStatus({ status }: ReservationStatusProps) {
  const statusStyles = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };

  const style =
    statusStyles[status as keyof typeof statusStyles] ??
    "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {status}
    </span>
  );
}
