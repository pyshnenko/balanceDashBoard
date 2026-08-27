import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { ServerTable } from './ServerTable';
import type { GroupedServersState, ServerInfo } from './ServerTable';
import { formatBytes } from '../../utils/funcs';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface GlassCardWrapperProps {
  pxname: string;
  allItems: {
    servers: ServerInfo[];
    totalBin?: number;
    totalBout?: number;
  };
  isDark: boolean;
}

const GlassCardWrapper: React.FC<GlassCardWrapperProps> = ({ pxname, allItems, isDark }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        '@keyframes floatBlob': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(180px, -60px) scale(1.2)' },
          '66%': { transform: 'translate(-120px, 40px) scale(0.85)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        // Анимация мягкой неоновой пульсации для Live-индикатора
        '@keyframes pulseGlow': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(46, 204, 113, 0.5)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(46, 204, 113, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(46, 204, 113, 0)' },
        }
      }}
    >
      <Card
        sx={{
          p: { xs: 0, sm: 1 },
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
          background: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.4)' : '0 20px 40px rgba(99, 102, 241, 0.06)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(99, 102, 241, 0.12)',
          '&:hover': {
            boxShadow: isDark ? '0 30px 60px rgba(99, 102, 241, 0.2)' : '0 30px 60px rgba(99, 102, 241, 0.12)',
          }
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            top: 'calc(50% - 250px)',
            left: 'calc(50% - 250px)',
            pointerEvents: 'none',
            zIndex: 1,
            background: isDark 
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.1) 40%, transparent 70%)' 
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(56, 189, 248, 0.08) 45%, transparent 70%)',
            animation: 'floatBlob 10s infinite ease-in-out',
            willChange: 'transform',
          }}
        />

        <CardContent sx={{ position: 'relative', zIndex: 2, p: { xs: 2, sm: 4 }, background: 'transparent' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: 'center', 
              textAlign: { xs: 'center', sm: 'left' },
              gap: 2,
              mb: 3, 
              pb: 1.5, 
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.04)' 
            }}
          >
            {/* Заголовок с Live-точкой и градиентным текстом */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' }, width: { xs: '100%', sm: 'auto' } }}>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: '#2ecc71',
                  animation: 'pulseGlow 2s infinite ease-in-out',
                  flexShrink: 0
                }} 
              />
              <Typography 
                variant="h6" 
                component="h2" 
                sx={{ 
                  fontWeight: 800, 
                  letterSpacing: '0.3px', 
                  background: isDark 
                    ? 'linear-gradient(90deg, #ffffff, #cbd5e1)' 
                    : 'linear-gradient(90deg, #0f172a, #475569)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}
              >
                Статус серверов ({pxname})
              </Typography>
            </Box>
            
            {allItems.totalBin !== undefined && allItems.totalBout !== undefined && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isDark ? '#94a3b8' : '#475569', 
                  fontWeight: '600', 
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)', 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: '8px', 
                  border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99,102,241,0.1)',
                  whiteSpace: 'nowrap',
                  alignSelf: { xs: 'center', sm: 'auto' }
                }}
              >
                Трафик: 📥 {formatBytes(allItems.totalBin)} | 📤 {formatBytes(allItems.totalBout)}
              </Typography>
            )}
          </Box>
          <ServerTable servers={allItems.servers || []} isDark={isDark} />
        </CardContent>
      </Card>
    </Box>
  );
};

export const Dashboard: React.FC = () => {
  const [servers, setServers] = useState<GroupedServersState | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false); 

  useEffect(() => {
    const fetchStatus = async (): Promise<void> => {
      try {
        const response = await fetch('/stat/api/status');
        const data: GroupedServersState = await response.json();
        setServers(data);
      } catch (error) {
        console.error('Ошибка получения данных API:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box 
      sx={{ 
        position: 'relative',
        p: { xs: 2, sm: 4 }, 
        background: isDark 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' 
          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}
    >      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <IconButton 
          onClick={() => setIsDark(!isDark)} 
          sx={{ 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            color: isDark ? '#fbbf24' : '#4f46e5',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
          }}
        >
          {isDark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {servers && Object.keys(servers).map((pxname) => {
          const allItems = servers[pxname] || { servers: [] };
          return (
            <GlassCardWrapper key={pxname} pxname={pxname} allItems={allItems} isDark={isDark} />
          );
        })}
      </Box>
    </Box>
  );
};
