import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ServerTable } from './ServerTable';
import type { ServerInfo } from './ServerTable'; // Исправление для verbatimModuleSyntax

export const Dashboard: React.FC = () => {
  // Указываем тип состояния как массив ServerInfo
  const [servers, setServers] = useState<ServerInfo[]>([]);

  useEffect(() => {
    const fetchStatus = async (): Promise<void> => {
      try {
        // Изменено на относительный путь для работы на одном порту
        const response = await fetch('/stat/api/status');
        const data: ServerInfo[] = await response.json();
        setServers(data);
        console.log(data)
      } catch (error) {
        console.error('Ошибка получения данных API:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <Card sx={{ width: 400, p: 1, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 2, pb: 1, borderBottom: '2px solid #f5f6fa' }}>
            Статус серверов (Порт 17581)
          </Typography>
          <ServerTable servers={servers} />
        </CardContent>
      </Card>
    </Box>
  );
};
