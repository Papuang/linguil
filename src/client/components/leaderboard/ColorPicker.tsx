'use client';

import { memo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/client/components/ui/popover';
import { Button } from '@/client/components/ui/button';
import { Palette } from 'lucide-react';
import { CHART_COLORS } from '@/client/components/leaderboard/mock-data';

// Props for ColorPicker.
type ColorPickerProps = {
  // Currently selected color.
  selectedColor: string;
  // Callback on color change.
  onColorChange: (color: string) => void;
};

// A memoized color picker for the chart.
const ColorPicker = memo<ColorPickerProps>(({ selectedColor, onColorChange }) => (
  <div className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-2">
    <p className="hidden sm:block text-sm text-muted-foreground dark:text-foreground">Colour:</p>
    <Popover>
      <PopoverTrigger asChild>
        {/* Popover trigger button, showing the selected color. */}
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          style={{ backgroundColor: selectedColor }}
          aria-label={`Current chart color: ${selectedColor}. Click to change.`}
        >
          <Palette className="h-4 w-4 text-white" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        {/* Popover content with color options. */}
        <div className="flex gap-2">
          {CHART_COLORS.map((color) => (
            <Button
              key={color}
              variant="outline"
              size="icon"
              className="w-8 h-8"
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              aria-label={`Set chart color to ${color}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  </div>
));
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };