import path from 'path';
import express, { Request, Response } from 'express';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import https from 'https';
import cors from 'cors';
import {backendsNames} from './consts/names';

// Ищем .env строго в корне папки balanceDashBoard
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

const IS_DEV = process.env.NODE_ENV === 'development';

app.use(cors());
app.use(express.json());

// --- КОНФИГУРАЦИЯ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ---
const HAPROXY_URL: string = process.env.HAPROXY_URL || 'https://euroigor.ru';
const HAPROXY_AUTH = { 
  username: process.env.HAPROXY_USER || '', 
  password: process.env.HAPROXY_PASS || '' 
};

const POLL_INTERVAL: number = 5000;

export type ServerStatus = 'UP' | 'DOWN' | string;

export interface ServerInfo {
  name: string;
  status: ServerStatus;
  scur: number;
  rate: number;
  hrsp_5xx: number;
  lastchg: string;
  bin: number;
  bout: number;
}

// Новая структура группы бэкенда: содержит сервера и суммарный трафик
export interface BackendGroup {
  servers: ServerInfo[];
  totalBin: number;  // Всего байт получено
  totalBout: number; // Всего байт отправлено
}

interface GroupedServersState {
  [pxname: string]: BackendGroup;
}

let serversState: GroupedServersState = {};

const axiosInstance = axios.create({
    auth: HAPROXY_AUTH,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Функция отправки оповещения в Телеграм-бот
async function sendNotification(serverName: string, oldStatus: ServerStatus, newStatus: ServerStatus): Promise<void> {
  const statusEmoji = newStatus === 'UP' ? '✅' : '🚨';
  const message = `${statusEmoji} <b>Сервер [${serverName}]</b> изменил статус:\n• Было: <code>${oldStatus}</code>\n• Стало: <b>${newStatus}</b>`;
  
  console.log(`[ALERT] ${serverName}: ${oldStatus} -> ${newStatus}`);

  try {
    // На локальной машине этот запрос выдаст ошибку ECONNREFUSED, если бот не запущен дома.
    // Оборачиваем в try/catch с таймаутом, чтобы отладка не зависала и сервер не падал.
    await axios.post('http://localhost:4500/alert', { message }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 2000 
    });
  } catch (error: any) {
    // Просто пишем в консоль, что бот недоступен, не ломая работу дашборда
    console.log(`[ALERT INFO] ТГ-бот локально недоступен (это нормально для отладки): ${error.message}`);
  }
}

// Фоновый опрос балансировщика
async function pollHAProxy(): Promise<void> {
  try {
    const response = await axiosInstance.get<string>(HAPROXY_URL);
    
    if (typeof response.data === 'string' && (response.data.trim().startsWith('<?xml') || response.data.trim().startsWith('<html') || response.data.trim().startsWith('<!DOCTYPE'))) {
      console.error('[WARNING] HAProxy вернул HTML вместо CSV. Проверьте логин/пароль в .env');
      return; 
    }

    const records: string[][] = parse(response.data, { comment: '#', skip_empty_lines: true });

    // Создаем временный объект актуального состояния, строго соответствующий GroupedServersState
    const tempState: GroupedServersState = {};

    records.forEach((row: string[]) => {
      const pxname = row[0];  // Имя секции (например, port_17581)
      const svname = row[1];  // Имя сервера (client_main / client_backup / BACKEND)
      const status = row[17]; // Статус (UP / DOWN)
      
      const scur = Number(row[4]) || 0;       // Текущие сессии
      const rate = Number(row[33]) || 0;      // Текущий RPS
      const hrsp_5xx = Number(row[43]) || 0;  // Ответы 5xx
      const lastchgSec = Number(row[23]) || 0; // Секунд с последней смены статуса
      
      // Достаем байты трафика из CSV (индексы 8 и 9 для bin/bout)
      const bin = Number(row[8]) || 0;
      const bout = Number(row[9]) || 0;

      // Фильтруем по вашему массиву портов. Строку FRONTEND убираем, а BACKEND — пропускаем, так как в ней лежит сумма
      if (backendsNames.includes(pxname) && svname !== 'FRONTEND') {
        
        // Инициализируем группу в объекте, если её ещё нет
        if (!tempState[pxname]) {
          tempState[pxname] = {
            servers: [],
            totalBin: 0,
            totalBout: 0
          };
        }

        // Если это строка BACKEND, то записываем из неё суммарный трафик всей группы
        if (svname === 'BACKEND') {
          tempState[pxname].totalBin = bin;
          tempState[pxname].totalBout = bout;
        } else {
          // Если это обычный сервер бэкенда — отправляем уведомления и добавляем в массив группы
          // Ищем старый статус сервера внутри массива старого состояния сервера (прошлый цикл опроса)
          const oldServerData = serversState[pxname]?.servers.find(s => s.name === svname);
          const oldStatus = oldServerData?.status;

          if (oldStatus && oldStatus !== status) {
            sendNotification(svname, oldStatus, status);
          }

          let lastchg = 'только что';
          if (lastchgSec > 0) {
            const hours = Math.floor(lastchgSec / 3600);
            const minutes = Math.floor((lastchgSec % 3600) / 60);
            lastchg = hours > 0 ? `${hours}ч ${minutes}м назад` : `${minutes}м назад`;
          }

          // Складываем только реальные сервера в массив
          tempState[pxname].servers.push({
            name: svname,
            status,
            scur,
            rate,
            hrsp_5xx,
            lastchg,
            bin,
            bout
          });
        }
      }
    });

    // Перезаписываем глобальное состояние полностью готовым сгруппированным объектом
    serversState = tempState;

  } catch (error: any) {
    console.error('Ошибка опроса HAProxy:', error.message);
  }
}

setInterval(pollHAProxy, POLL_INTERVAL);
pollHAProxy();

// --- ЭНДПОИНТЫ API ---
const frontendPath = path.resolve(__dirname, '../../frontend/dist');

// Сначала раздаем файлы стилей, картинок и скриптов (с префиксом /stat)
app.use('/stat', express.static(frontendPath));

// ИСПРАВЛЕНО: Добавлен роут '/stat/api/status' специально для локальной отладки без Nginx
app.get(['/api/status', '//api/status', '/stat/api/status'], (req: Request, res: Response) => {
  res.json(serversState);
});

// Ловушка последней надежды для SPA
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Слушаем на 0.0.0.0, чтобы внешние запросы от Nginx доходили до порта
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});
