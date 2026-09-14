import type { ReactNode } from "react";

const StackedIcon = ({ children }: { children: ReactNode }) => (
  <span className="relative flex size-5 items-center justify-center">
    {children}
  </span>
);

export default StackedIcon;
