import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Typography } from '@mui/material';
import { serverNames } from '../../constans/serverNames';
import { formatBytes } from '../../utils/funcs';

export interface ServerInfo {
  name: string;
  status: string;
  scur: number;
  rate: number;
  hrsp_5xx: number;
  lastchg: string;
  bin: number;
  bout: number;
}

export interface GroupedServersState {
  [pxname: string]: {
    servers: ServerInfo[];
    totalBin?: number;
    totalBout?: number;
  }
}

interface ServerTableProps {
  servers: ServerInfo[];
}

export const ServerTable: React.FC<ServerTableProps> = ({ servers }) => {
  return (
    // Убираем компонент={Paper} и boxShadow, чтобы таблица слилась со стеклянной картой
    <TableContainer sx={{ background: 'transparent' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }}>Сервер</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="center">Статус</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">RPS</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">Принято</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">Отдано</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">Сессии</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">5xx</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.06)' }} align="right">Изменен</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {servers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748b', borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                Получение данных от балансировщика...
              </TableCell>
            </TableRow>
          ) : (
            servers.map((server) => {
              const isUp = server.status === 'UP';
              return (
                <TableRow 
                  key={server.name} 
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600, color: '#f8fafc', borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                    {serverNames.get(server.name) ?? server.name}
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                    <Chip 
                      label={server.status} 
                      size="small"
                      sx={{ 
                        // Яркие неоновые градиенты для статусов вместо скучных блеклых плашек
                        background: isUp 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                          : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', 
                        color: 'white', 
                        fontWeight: 700,
                        borderRadius: '6px',
                        boxShadow: isUp ? '0 2px 10px rgba(16, 185, 129, 0.3)' : '0 2px 10px rgba(244, 63, 94, 0.3)',
                        fontSize: '0.75rem'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                    <Typography variant="body2" sx={{ fontWeight: server.rate > 0 ? 700 : 400, color: server.rate > 0 ? '#38bdf8' : '#cbd5e1' }}>
                      {server.rate}
                    </Typography>
                  </TableCell>                  
                  <TableCell align="right" sx={{ color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.06)' }}>{formatBytes(server.bin)}</TableCell>
                  <TableCell align="right" sx={{ color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.06)' }}>{formatBytes(server.bout)}</TableCell>
                  <TableCell align="right" sx={{ color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.06)' }}>{server.scur}</TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.06)',
                      fontWeight: server.hrsp_5xx > 0 ? 700 : 400,
                      color: server.hrsp_5xx > 0 ? '#f43f5e' : '#64748b' 
                    }}
                  >
                    {server.hrsp_5xx}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#64748b', fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' }}>
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
