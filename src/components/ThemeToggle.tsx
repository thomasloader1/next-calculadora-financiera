'use client';
import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8 text-notion-muted dark:text-white hover:text-notion-fg dark:hover:bg-notion-surface"
      aria-label="Toggle theme"
      startContent={<i className={`pi ${resolvedTheme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`}></i>}
    >
      <i className={`pi ${resolvedTheme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`}></i>
    </Button>
  );
};
