import {
  adminRaisedRed,
  adminRaisedLight,
} from "./adminButtonStyles";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  itemName: string;
  title?: string;
  details?: string;
  errorMessage?: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  isOpen,
  itemName,
  title = "Delete item",
  details,
  errorMessage,
  isDeleting = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby={
          details
            ? "confirm-delete-details confirm-delete-description"
            : "confirm-delete-description"
        }
        className="w-full max-w-md cursor-default rounded-2xl border border-red-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-red-700"
          >
            !
          </div>

          <div>
            <h2 id="confirm-delete-title" className="font-display text-2xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink">
              Are you sure you want to delete <strong>{itemName}</strong>?
            </p>
            {details && (
              <p
                id="confirm-delete-details"
                className="mt-2 text-sm leading-6 text-ink"
              >
                {details}
              </p>
            )}
            <p
              id="confirm-delete-description"
              className="mt-2 text-sm font-semibold text-red-700"
            >
              This action <strong>CANNOT</strong> be undone.
            </p>
            {errorMessage && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedRed}`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
