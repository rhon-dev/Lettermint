import { displayText } from './sanitize';
import { SHAPE_LABELS, type Shape } from './shapes';

export function describeLogo(
  state: { text: string; uppercase: boolean; shape: Shape; bgColor: string; fgColor: string; letterStyle?: 'fill' | 'outline' },
  family: string,
): string {
  const text = displayText(state.text, state.uppercase);
  const subject = text ? `Initials “${text}”` : 'Empty initials logo';
  const letters = `${state.fgColor.toUpperCase()} ${state.letterStyle === 'outline' ? 'outlined ' : ''}letters`;
  const ground =
    state.shape === 'none'
      ? 'with no background shape'
      : `on a ${state.bgColor.toUpperCase()} ${SHAPE_LABELS[state.shape].toLowerCase()}`;
  return `${subject} in ${family}, ${letters} ${ground}`;
}
