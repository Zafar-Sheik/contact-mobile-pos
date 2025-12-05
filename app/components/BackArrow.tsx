// components/BackArrow.tsx
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BackArrowProps {
  href?: string; // Optional custom back URL
  className?: string; // Optional additional classes
  onClick?: () => void; // Optional click handler
}

export default function BackArrow({
  href = "/",
  className = "",
  onClick,
}: BackArrowProps) {
  const baseClasses =
    "p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200";

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${className}`}
        aria-label="Go back">
        <ArrowLeft size={20} />
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClasses} ${className}`}
      aria-label="Go back">
      <ArrowLeft size={20} />
    </Link>
  );
}
