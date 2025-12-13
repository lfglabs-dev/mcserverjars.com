import {
  RiServerLine,
  RiGitBranchLine,
  RiSettings3Line,
  RiFlashlightLine,
  RiBox3Line,
} from "@remixicon/react";

interface CategoryIconProps {
  category: string;
  className?: string;
}

export function CategoryIcon({ category, className = "h-5 w-5" }: CategoryIconProps) {
  switch (category) {
    case "server":
      return <RiServerLine className={className} />;
    case "proxy":
      return <RiGitBranchLine className={className} />;
    case "modloader":
      return <RiSettings3Line className={className} />;
    case "hybrid":
      return <RiFlashlightLine className={className} />;
    default:
      return <RiBox3Line className={className} />;
  }
}

