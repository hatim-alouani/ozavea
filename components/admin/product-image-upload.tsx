"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProductImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

export default function ProductImageUpload({
  value,
  onChange,
}: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const MAX_SIZE = 8 * 1024 * 1024;

  const uploadFile = async (file: File) => {
    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Image must be smaller than 8 MB.");
      return;
    }

    setUploading(true);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `${crypto.randomUUID()}.${fileExtension}`;

      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (err) {
      console.error("Image upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div className="oz-image-upload">
      <div
        className={`oz-image-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              uploadFile(file);
            }

            event.target.value = "";
          }}
        />

        {value ? (
          <div className="oz-image-preview">
            <img src={value} alt="Product preview" />

            <div className="oz-image-overlay">
              <span>
                {uploading
                  ? "Uploading..."
                  : "Click or drop to replace image"}
              </span>
            </div>
          </div>
        ) : (
          <div className="oz-image-empty">
            <div className="oz-upload-icon">↑</div>

            <strong>
              {uploading
                ? "Uploading image..."
                : "Drop your product image here"}
            </strong>

            <span>
              or click to browse files
            </span>

            <small>JPG, PNG, WEBP · Max 8 MB</small>
          </div>
        )}
      </div>

      {value && !uploading && (
        <button
          type="button"
          className="oz-image-remove"
          onClick={(event) => {
            event.stopPropagation();
            onChange("");
          }}
        >
          Remove image
        </button>
      )}

      {error && (
        <p className="oz-image-error">{error}</p>
      )}
    </div>
  );
}