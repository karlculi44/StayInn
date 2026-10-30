import { useState } from "react";
import { adminRaisedLight, adminRaisedRed } from "./adminButtonStyles";

type ConfirmCancelReservationModalProps = {
  isOpen: boolean;
  referenceId: string;
  isCancelling: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export default function ConfirmCancelReservationModal({
  isOpen,
  referenceId,
  isCancelling,
  error,
  onCancel,
  onConfirm,
}: ConfirmCancelReservationModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isCancelling) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-cancel-title"
        aria-describedby="confirm-cancel-description"
        className="animate-ui-enter w-full max-w-md cursor-default rounded-2xl border border-amber-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-800"
          >
            !
          </div>

          <div>
            <h2 id="confirm-cancel-title" className="font-display text-2xl">
              Cancel reservation?
            </h2>
            <p className="mt-3 break-all text-sm leading-6 text-ink">
              Are you sure you want to cancel reservation{" "}
              <strong>{referenceId}</strong>?
            </p>
            <p
              id="confirm-cancel-description"
              className="mt-2 text-sm font-semibold text-amber-800"
            >
              This reservation will be cancelled and cannot be restored.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium">
          Cancellation reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            required
            className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
          >
            Keep reservation
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={isCancelling || !reason.trim()}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedRed}`}
          >
            {isCancelling ? "Cancelling..." : "Cancel reservation"}
          </button>
        </div>
      </div>
    </div>
  );
}
