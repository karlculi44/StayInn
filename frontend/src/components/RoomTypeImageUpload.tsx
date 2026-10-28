import { useEffect, useMemo, useRef, useState } from "react";
import { getRoomTypeImage } from "../utils/room-image";

type RoomTypeImageUploadProps = {
  roomTypeName: string;
  existingImage?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
};

const maximumImageSize = 5 * 1024 * 1024;
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export default function RoomTypeImageUpload({
  roomTypeName,
  existingImage,
  file,
  onFileChange,
}: RoomTypeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState("");
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  const imageSource = previewUrl
    ? previewUrl
    : existingImage
      ? getRoomTypeImage(roomTypeName, existingImage)
      : null;

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const selectImage = (selectedFile?: File) => {
    if (!selectedFile) {
      return;
    }
    if (!acceptedImageTypes.includes(selectedFile.type)) {
      setValidationError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (selectedFile.size > maximumImageSize) {
      setValidationError("Image must be no larger than 5 MB.");
      return;
    }

    setValidationError("");
    onFileChange(selectedFile);
  };

  return (
    <div>
      <p className="text-sm font-medium text-ink">Room type thumbnail</p>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          selectImage(event.dataTransfer.files[0]);
        }}
        className="mt-2 rounded-2xl border border-dashed border-black/20 bg-cream/50 p-4"
      >
        {imageSource ? (
          <img
            src={imageSource}
            alt={`${roomTypeName} thumbnail preview`}
            className="h-44 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-3 text-center text-muted">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-10"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <p className="text-sm">Select or drop an image to upload</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose room type thumbnail image"
          onChange={(event) => {
            selectImage(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-semibold text-sage underline underline-offset-2"
          >
            {file || existingImage ? "Replace image" : "Choose image"}
          </button>
          {file && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => {
                  onFileChange(null);
                  setValidationError("");
                }}
                className="text-sm font-semibold text-muted underline underline-offset-2"
              >
                Cancel replacement
              </button>
            </>
          )}
          {!file && !existingImage && (
            <span className="text-xs text-muted">JPEG, PNG, or WebP · Max 5 MB</span>
          )}
        </div>
      </div>
      {validationError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {validationError}
        </p>
      )}
    </div>
  );
}
