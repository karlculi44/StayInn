import { adminRaisedDark, adminRaisedLight } from "./adminButtonStyles";

type ConfirmSaveModalProps = {
  isOpen: boolean;
  isSaving?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmSaveModal({
  isOpen,
  isSaving = false,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmSaveModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-save-title"
        aria-describedby="confirm-save-description"
        className="animate-ui-enter w-full max-w-md cursor-default rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-save-title" className="font-display text-2xl">
          Confirm Room Changes
        </h2>
        <p
          id="confirm-save-description"
          className="mt-3 text-sm leading-6 text-ink"
        >
          Are you sure you want to save the changes made to this room?
        </p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedDark}`}
          >
            {isSaving ? "Saving..." : "Confirm Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
