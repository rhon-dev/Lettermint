import { displayText } from './sanitize';
import type { Shape } from './shapes';

export function describeLogo(
  state: { text: string; uppercase: boolean; shape: Shape; bgColor: string; fgColor: string },
  family: string,
): string {
  const text = displayText(state.text, state.uppercase);
  const subject = text ? `Initials “${text}”` : 'Empty initials logo';
  return `${subject} in ${family}, ${state.fgColor.toUpperCase()} letters on a ${state.bgColor.toUpperCase()} ${state.shape}`;
}
