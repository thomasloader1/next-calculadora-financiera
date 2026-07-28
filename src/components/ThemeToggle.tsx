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
      className="h-8 w-8 text-cds-muted dark:text-white hover:text-cds-foreground dark:hover:bg-cds-surface-dark"
      aria-label="Toggle theme"
      startContent={<i className={`pi ${resolvedTheme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`}></i>}
    >
      <i className={`pi ${resolvedTheme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`}></i>
    </Button>
  );
};
