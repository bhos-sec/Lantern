type SoundType = 'click' | 'message' | 'join';

const SOUNDS: Record<SoundType, string> = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  join: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

/** Play a UI sound effect. Silently swallowed if the browser blocks autoplay. */
export function playSound(type: SoundType, enabled: boolean): void {
  if (!enabled) return;
  const audio = new Audio(SOUNDS[type]);
  audio.volume = 0.4;
  audio.play().catch(() => {});
}
