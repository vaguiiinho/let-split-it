import { initial } from '@/lib/format';

export function PersonAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'size-14 text-2xl' : 'size-10';
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border-2 border-line bg-accent font-black text-accent-ink ${dims}`}
    >
      {initial(name)}
    </span>
  );
}
