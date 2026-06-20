"use client";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
}

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <form action={onDelete}>
      <button
        type="submit"
        style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "rgba(239,68,68,1)",
          padding: "6px 14px",
          borderRadius: "6px",
          fontWeight: "500",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        삭제
      </button>
    </form>
  );
}
