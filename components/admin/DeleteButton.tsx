"use client";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
}

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <form action={onDelete}>
      <button
        type="submit"
        className="bg-danger/15 border border-danger/40 text-danger"
        style={{
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
