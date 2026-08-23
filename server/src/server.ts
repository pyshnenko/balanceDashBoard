import path from 'path';
import express, { Request, Response } from 'express';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import https from 'https';
import cors from 'cors';

// Ищем .env строго в корне папки balanceDashBoard
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// --- КОНФИГУРАЦИЯ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ---
const HAPROXY_URL: string = process.env.HAPROXY_URL || 'https://euroigor.ru';
const HAPROXY_AUTH = { 
  username: process.env.HAPROXY_USER || '', 
  password: process.env.HAPROXY_PASS || '' 
};

const BACKEND_NAME: string = 'port_17581';
const POLL_INTERVAL: number = 5000;

export type ServerStatus = 'UP' | 'DOWN' | string;

interface ServersState {
  [serverName: string]: ServerInfo;
}

export interface ServerInfo {
  name: string;
  status: ServerStatus;
  scur: number;       // Текущие активные сессии
  rate: number;       // Текущий RPS (запросов в секунду)
  hrsp_5xx: number;   // Ошибки сервера (5xx)
  lastchg: string;    // Время с последнего изменения статуса (в читаемом виде)
}

let serversState: ServersState = {};

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
    // Шлем алерт на локальный порт бота app3.js
    await axios.post('http://localhost:4500/alert', { message }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Не удалось отправить уведомление в ТГ-бот:', error.message);
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

    records.forEach((row: string[]) => {
      const pxname = row[0];  // Имя секции (port_17581)
      const svname = row[1];  // Имя сервера (client_main / client_backup)
      const status = row[17]; // Статус (UP / DOWN)
      
      // Достаем новые полезные метрики из CSV HAProxy
      const scur = Number(row[4]) || 0;       // Текущие сессии
      const rate = Number(row[33]) || 0;      // Текущий RPS
      const hrsp_5xx = Number(row[43]) || 0;  // Ответы 5xx
      const lastchgSec = Number(row[23]) || 0; // Секунд с последней смены статуса

      if (pxname === BACKEND_NAME && svname !== 'BACKEND' && svname !== 'FRONTEND') {
        const oldStatus = serversState[svname]?.status;

        if (oldStatus && oldStatus !== status) {
          sendNotification(svname, oldStatus, status);
        }

        // Переводим секунды изменения статуса в понятный формат (например, "2ч 15м")
        let lastchg = 'только что';
        if (lastchgSec > 0) {
          const hours = Math.floor(lastchgSec / 3600);
          const minutes = Math.floor((lastchgSec % 3600) / 60);
          lastchg = hours > 0 ? `${hours}ч ${minutes}м назад` : `${minutes}м назад`;
        }

        // Сохраняем расширенный объект состояния
        serversState[svname] = { name: svname, status, scur, rate, hrsp_5xx, lastchg };
      }
    });
  } catch (error: any) {
    console.error('Ошибка опроса HAProxy:', error.message);
  }
}

setInterval(pollHAProxy, POLL_INTERVAL);
pollHAProxy();

// --- ЭНДПОИНТЫ API ---
// Nginx отрезал /stat, поэтому Node.js должен слушать чистый /api/status
app.get('//api/status', (req: Request, res: Response<ServerInfo[]>) => {
  res.json(Object.values(serversState));
});

// 2. Только ПОСЛЕ роута API определяем пути к статике фронтенда
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// 3. И в самом конце перехватываем всё остальное для работы React-роутинга
app.get('/*splat', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Слушаем на 0.0.0.0, чтобы внешние запросы от Nginx доходили до порта
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});
