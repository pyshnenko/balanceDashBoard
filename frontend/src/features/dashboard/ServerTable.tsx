import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Typography } from '@mui/material';

// Описываем расширенную структуру, приходящую от бэкенда
export interface ServerInfo {
  name: string;
  status: string;
  scur: number;
  rate: number;
  hrsp_5xx: number;
  lastchg: string;
}

interface ServerTableProps {
  servers: ServerInfo[];
}

export const ServerTable: React.FC<ServerTableProps> = ({ servers }) => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#fcfcfd' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Сервер</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">Статус</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">RPS</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Сессии</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Ошибки 5xx</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">Изменен</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {servers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#999' }}>
                Получение данных от балансировщика...
              </TableCell>
            </TableRow>
          ) : (
            servers.map((server) => {
              const isUp = server.status === 'UP';
              return (
                <TableRow key={server.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {server.name}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={server.status} 
                      size="small"
                      sx={{ 
                        backgroundColor: isUp ? '#2ecc71' : '#e74c3c', 
                        color: 'white', 
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: server.rate > 0 ? 'bold' : 'normal' }}>
                      {server.rate}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{server.scur}</TableCell>
                  <TableCell align="right" sx={{ color: server.hrsp_5xx > 0 ? '#e74c3c' : 'inherit' }}>
                    {server.hrsp_5xx}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#666', fontSize: '0.8rem' }}>
                    {server.lastchg}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
