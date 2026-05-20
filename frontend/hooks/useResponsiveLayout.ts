import { useWindowDimensions } from 'react-native';

const DESKTOP_BREAKPOINT = 1024;
const MOBILE_BREAKPOINT = 768;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isMobile = width <= MOBILE_BREAKPOINT;
  return { isDesktop, isMobile, width };
}
