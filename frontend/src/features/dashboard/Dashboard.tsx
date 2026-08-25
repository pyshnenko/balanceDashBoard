import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ServerTable } from './ServerTable';
import type { GroupedServersState } from './ServerTable';
import { formatBytes } from '../../utils/funcs';

// Создаем анимированную карточку на базе MUI Card
const MotionCard = motion(Card);

export const Dashboard: React.FC = () => {
  const [servers, setServers] = useState<GroupedServersState | null>(null);

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
    // Общий контейнер. Рекомендуется темный или градиентный фон для раскрытия эффекта стекла.
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        p: 4, 
        gap: 4,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        minHeight: '100vh',
        perspective: '1500px' // Глубина для 3D наклона
      }}
    >      
      {servers && Object.keys(servers).map((pxname) => {
        const allItems = servers[pxname] || { servers: [] };

        // Инициализируем пружины анимации индивидуально для каждой карточки через хуки внутри подкомпонента
        return (
          <GlassCardWrapper key={pxname} pxname={pxname} allItems={allItems} />
        );
      })}
    </Box>
  );
};

// Выносим карточку в отдельный мини-компонент, чтобы анимация мыши работала независимо для каждой карточки
const GlassCardWrapper = ({ pxname, allItems }: { pxname: string, allItems: any }) => {
  const mouseXPercentage = useSpring(50, { stiffness: 250, damping: 25 });
  const mouseYPercentage = useSpring(50, { stiffness: 250, damping: 25 });
  const rotateX = useSpring(0, { stiffness: 150, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 22 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    mouseXPercentage.set((mouseX / width) * 100);
    mouseYPercentage.set((mouseY / height) * 100);

    // Легкий наклон (до 3 градусов), чтобы не ломать читаемость больших таблиц
    rotateX.set(((mouseY - height / 2) / height) * -3);
    rotateY.set(((mouseX - width / 2) / width) * 3);
  }

  function handleMouseLeave() {
    mouseXPercentage.set(50);
    mouseYPercentage.set(50);
    rotateX.set(0);
    rotateY.set(0);
  }

  // Градиенты для плавающего света под стеклом и на границах
  const backgroundSpotlight = useTransform(
    [mouseXPercentage, mouseYPercentage],
    ([x, y]) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(99, 102, 241, 0.07), transparent 50%)`
  );

const borderSpotlight = useTransform(
  [mouseXPercentage, mouseYPercentage],
  ([x, y]) => `radial-gradient(400px circle at ${x}% ${y}%, rgba(129, 140, 248, 0.45), transparent 60%)`
);

return (
  <MotionCard
    onMouseMove={handleMouseMove}
    onMouseLeave={handleMouseLeave}
    style={{
      rotateX: rotateX,
      rotateY: rotateY,
      transformStyle: 'preserve-3d',
      backgroundImage: backgroundSpotlight,
      // Используем запись [key: string]: any, чтобы TS не ругался на кастомную CSS-переменную
      ['--border-spotlight' as any]: borderSpotlight,
    }}
    sx={{
      width: 900,
      p: 1,
      borderRadius: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      transition: 'box-shadow 0.3s ease',

      // Эффект матового стекла
      background: 'rgba(30, 41, 59, 0.4)', 
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.04)',

      // Умная неоновая рамка по краям
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: '20px',
        padding: '1.5px', 
        background: 'var(--border-spotlight)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      },

      '&:hover': {
        boxShadow: '0 30px 60px rgba(99, 102, 241, 0.15)',
      }
    }}
  >
      <CardContent sx={{ color: '#fff' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3, 
            pb: 1.5, 
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)' 
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800, letterSpacing: '0.5px', color: '#f8fafc' }}>
            Статус серверов ({pxname})
          </Typography>
          
          {allItems.totalBin && allItems.totalBout && (
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: '600', bgcolor: 'rgba(255,255,255,0.03)', px: 1.5, py: 0.5, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              Трафик: 📥 {formatBytes(allItems.totalBin)} | 📤 {formatBytes(allItems.totalBout)}
            </Typography>
          )}
        </Box>
        <ServerTable servers={allItems.servers} />
      </CardContent>
    </MotionCard>
  );
};
