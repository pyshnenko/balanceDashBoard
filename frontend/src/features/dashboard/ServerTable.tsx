import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
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
  isDark?: boolean;
}

export const ServerTable: React.FC<ServerTableProps> = ({ servers, isDark = false }) => {
  // Делаем цвет подложки максимально близким к прозрачному стеклу карточки
  const stickyBg = isDark ? 'rgba(23, 31, 48, 0.65)' : 'rgba(255, 255, 255, 0.65)';

  return (
    <TableContainer 
      component="div" 
      sx={{ 
        background: 'transparent',
        maxWidth: '100%',
        overflowX: 'auto',
        '&::-webkit-scrollbar': { height: '6px' },
        '&::-webkit-scrollbar-thumb': { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderRadius: '4px'
        }
      }}
    >
      <Table 
        size="small" 
        sx={{ 
          minWidth: 750, 
          borderCollapse: 'separate',
          background: 'transparent', // Жестко сбрасываем фон самой таблицы
          '& td, & th': { backgroundColor: 'transparent' } // Убираем наслоение стандартных фонов MUI
        }}
      >
        <TableHead>
          <TableRow sx={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
            <TableCell 
              sx={{ 
                fontWeight: 700, 
                color: isDark ? '#94a3b8' : '#475569', 
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', 
                whiteSpace: 'nowrap',
                position: 'sticky',
                left: 0,
                zIndex: 10,
                // Принудительно через !important заставляем MUI применить наше стекло
                background: `${stickyBg} !important`, 
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(99, 102, 241, 0.08)',
              }}
            >
              Сервер
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="center">Статус</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">RPS</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">Принято</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">Отдано</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">Сессии</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">5xx</TableCell>
            <TableCell sx={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }} align="right">Изменен</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {servers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4, color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                Получение данных от балансировщика...
              </TableCell>
            </TableRow>
          ) : (
            servers.map((server) => {
              return (
                <TableRow 
                  key={server.name} 
                  sx={{ 
                    position: 'relative',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                    '&:hover': { 
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.02)',
                      '& th:first-of-type::before': { opacity: 1 }
                    },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <TableCell 
                    component="th" 
                    scope="row" 
                    sx={{ 
                      fontWeight: 600, 
                      color: isDark ? '#f8fafc' : '#1e293b', 
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', 
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      // Принудительно перебиваем стили ячейки
                      background: `${stickyBg} !important`,
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(99, 102, 241, 0.08)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        height: '70%',
                        width: '3px',
                        backgroundColor: '#6366f1',
                        boxShadow: '0 0 8px #6366f1',
                        borderRadius: '0 4px 4px 0',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        pointerEvents: 'none'
                      }
                    }}
                  >
                    {serverNames.get(server.name) ?? server.name}
                  </TableCell>
                  
                  <TableCell align="center" sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                    <span 
                      style={{ 
                        backgroundColor: server.status === 'UP' ? '#2ecc71' : '#e74c3c', 
                        color: 'white', 
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'inline-block'
                      }} 
                    >
                      {server.status}
                    </span>
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                    <span style={{ fontWeight: server.rate > 0 ? 'bold' : 'normal', color: server.rate > 0 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#cbd5e1' : '#334155') }}>
                      {server.rate}
                    </span>
                  </TableCell>                  
                  <TableCell align="right" sx={{ color: isDark ? '#cbd5e1' : '#334155', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }}>{formatBytes(server.bin)}</TableCell>
                  <TableCell align="right" sx={{ color: isDark ? '#cbd5e1' : '#334155', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }}>{formatBytes(server.bout)}</TableCell>
                  <TableCell align="right" sx={{ color: isDark ? '#cbd5e1' : '#334155', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>{server.scur}</TableCell>
                  <TableCell align="right" sx={{ color: server.hrsp_5xx > 0 ? '#e74c3c' : (isDark ? '#64748b' : '#94a3b8'), borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                    {server.hrsp_5xx}
                  </TableCell>
                  <TableCell align="right" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.8rem', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)', whiteSpace: 'nowrap' }}>
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
