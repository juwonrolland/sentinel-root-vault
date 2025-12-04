import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface HapticButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'light', onClick, ...props }, ref) => {
    const { vibrate } = useHapticFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      vibrate(hapticType);
      onClick?.(e);
    };

    return <Button ref={ref} onClick={handleClick} {...props} />;
  }
);

HapticButton.displayName = "HapticButton";

export { HapticButton };
