import React from 'react';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Описываем пропсы компонента
interface StatusBadgeProps {
  status: 'UP' | 'DOWN' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const theme = useTheme();
  const isUp = status === 'UP';

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        // Благодаря расширению типов выше, TS подсветит up и down автоматически
        backgroundColor: isUp ? theme.palette.status.up : theme.palette.status.down,
        color: '#fff',
        fontWeight: 'bold',
        borderRadius: '4px',
      }}
    />
  );
};
