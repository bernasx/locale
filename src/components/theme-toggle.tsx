import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <DropdownMenu><DropdownMenuTrigger asChild><Button className="theme-toggle" variant="ghost" size="icon" aria-label="Change color theme" title="Change color theme"><Sun className="theme-icon-light" /><Moon className="theme-icon-dark" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" aria-label="Color theme">
    {([{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <DropdownMenuItem key={value} role="menuitemradio" aria-checked={theme === value} onSelect={() => setTheme(value)}><Icon /><span className="theme-option-label">{label}</span>{theme === value && <Check />}</DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>;
}
