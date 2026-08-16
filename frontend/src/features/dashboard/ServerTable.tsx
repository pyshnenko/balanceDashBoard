import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@mui/material';
import { StatusBadge } from '../../components/StatusBadge';

// Импортируем интерфейс структуры данных (можно вынести в общий файл типов shared/types.ts)
export interface ServerInfo {
  name: string;
  status: string;
}

interface ServerTableProps {
  servers: ServerInfo[];
}

export const ServerTable: React.FC<ServerTableProps> = ({ servers }) => {
  if (servers.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', p: 1 }}>
        Получение данных...
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {servers.map((server) => (
            <TableRow key={server.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell sx={{ py: 1.5, px: 1, fontWeight: 500, fontSize: '14px' }}>
                {server.name}
              </TableCell>
              <TableCell align="right" sx={{ py: 1.5, px: 1 }}>
                <StatusBadge status={server.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
